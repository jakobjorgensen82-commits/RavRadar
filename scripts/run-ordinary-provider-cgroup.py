#!/usr/bin/env python3
"""Run the existing normal weather caller in one owned hosted Linux cgroup."""

from contextlib import ExitStack
import json
import os
from pathlib import Path
import select
import signal
import stat
import subprocess
import sys
import tempfile
import threading
import time


ROOT = Path(__file__).resolve().parents[1]
SELF = Path(__file__).resolve()
BOOTSTRAP_PYTHON = "/usr/bin/python3"
PROVIDERS = {
    "dmi": ("run-dmi-bulk-supervised.py", b"ordinary_dmi_producer_closed=true\n"),
    "copernicus": ("run-copernicus-current-pilot-with-retry.py", b"copernicus_producer_closed=true\n"),
}
FRAME_LIMIT = 128 * 1024
OUTPUT_LIMIT = 64 * 1024
SUMMARY_LIMIT = 1024 * 1024
CONTROL_SECONDS = 5
# The DMI stop routine allows two ten-second waits and two seconds for readers.
# Keep that cooperative window after losing the outer step owner.
OWNER_GRACE_SECONDS = 24
DRY_ENV = {"PATH": "/usr/bin:/bin", "LANG": "C.UTF-8"}
CHANNELS = {
    "GITHUB_OUTPUT": ("set_output_", OUTPUT_LIMIT),
    "GITHUB_STEP_SUMMARY": ("step_summary_", SUMMARY_LIMIT),
}
SHARED_PROVIDER_ENV = frozenset({
    "PATH", "HOME", "LANG", "LC_ALL", "TZ", "TMPDIR", "TMP", "TEMP",
    "LD_LIBRARY_PATH", "SSL_CERT_FILE", "SSL_CERT_DIR", "REQUESTS_CA_BUNDLE",
    "CURL_CA_BUNDLE", "HTTPS_PROXY", "HTTP_PROXY", "NO_PROXY",
    "https_proxy", "http_proxy", "no_proxy", "PYTHONUNBUFFERED",
    "PYTHONUTF8", "PYTHONNOUSERSITE", "PYTHONDONTWRITEBYTECODE",
    "GITHUB_OUTPUT", "GITHUB_STEP_SUMMARY", "GITHUB_RUN_ID",
    "GITHUB_RUN_ATTEMPT", "GITHUB_SHA", "RUNNER_TEMP", "RUNNER_TRACKING_ID",
})
DMI_PROVIDER_ENV = frozenset({
    "DMI_API_KEY", "WEATHER_USER_AGENT", "COASTAL_POINT_STAGE_PATH",
    "DMI_PART_CONTINUITY_DONOR_PATH", "DMI_HARMONIE_RUN_RETENTION_HOURS",
    "DMI_STAC_ROOT", "DMI_STAC_MAX_INVENTORY_ITEMS", "DMI_STAC_MAX_PAGES",
    "RAVRADAR_PRODUCTION_TARGET_HOUR", "RAVRADAR_PRIVATE_RUNTIME_ROOT",
    "RAVRADAR_PRIVATE_RUNTIME_BUNDLE", "RAVRADAR_DMI_STRICT_CURRENT_LEAD_POLICY",
})
COPERNICUS_PROVIDER_ENV = frozenset({
    "COPERNICUSMARINE_SERVICE_USERNAME", "COPERNICUSMARINE_SERVICE_PASSWORD",
    "COPERNICUS_ADVISORY_HISTORY_MAX_SECONDS", "COPERNICUS_ADVISORY_HISTORY_MAX_SHARDS_PER_PRODUCT",
    "COPERNICUS_OPERATIONAL_REFRESH_MAX_SHARDS", "RAVRADAR_PRIVATE_COPERNICUS_CURRENT_RANGE_CACHE",
    "RAVRADAR_PRIVATE_COPERNICUS_CURRENT_RANGE_TARGET_REGISTRY",
})
PYTHON_EXECUTABLE_KEY = "RAVRADAR_PROVIDER_PYTHON"


class ProviderRefused(RuntimeError):
    pass


def require(condition, code):
    if not condition:
        raise ProviderRefused(code)


def read_exact(fd, size):
    # The owner signal also uses this pipe. Never buffer beyond this frame.
    contents = bytearray()
    while len(contents) < size:
        block = os.read(fd, size - len(contents))
        require(block, "PROVIDER_OWNER_INPUT_CLOSED")
        contents.extend(block)
    return bytes(contents)


def read_environment(fd):
    size = int.from_bytes(read_exact(fd, 4), "big")
    require(0 < size <= FRAME_LIMIT, "PROVIDER_ENV_FRAME_SIZE")
    environment = json.loads(read_exact(fd, size))
    require(isinstance(environment, dict) and all(
        isinstance(key, str) and key and "=" not in key and "\0" not in key
        and isinstance(value, str) and "\0" not in value for key, value in environment.items()
    ), "PROVIDER_ENV_FRAME_INVALID")
    return environment


def environment_frame(environment):
    data = json.dumps(environment, ensure_ascii=True, separators=(",", ":")).encode("ascii")
    require(0 < len(data) <= FRAME_LIMIT, "PROVIDER_ENV_FRAME_SIZE")
    return len(data).to_bytes(4, "big") + data


def poll_fd(fd, milliseconds=0):
    watched = select.poll()
    watched.register(fd, select.POLLIN)
    return bool(watched.poll(milliseconds))


def watch_owner(provider_fd):
    """Only this process retains the read end when the weather caller execs."""
    descriptor = Path(f"/proc/self/fdinfo/{provider_fd}").read_text(encoding="ascii")
    require(f"Pid:\t{os.getppid()}" in descriptor.splitlines()
            and stat.S_ISFIFO(os.fstat(0).st_mode), "PROVIDER_WATCH_OWNER_UNPROVED")
    watched = select.poll()
    watched.register(provider_fd, select.POLLIN)
    watched.register(0, select.POLLIN | select.POLLHUP)
    events = dict(watched.poll())
    if provider_fd in events:
        return 0
    requested = os.read(0, 1)
    try:
        signal.pidfd_send_signal(provider_fd, signal.SIGINT if requested == b"I" else signal.SIGTERM)
        if not poll_fd(provider_fd, OWNER_GRACE_SECONDS * 1000):
            signal.pidfd_send_signal(provider_fd, signal.SIGKILL)
    except ProcessLookupError:
        pass
    return 0


def provider_environment(provider, environ, executable):
    names = SHARED_PROVIDER_ENV | (DMI_PROVIDER_ENV if provider == "dmi" else COPERNICUS_PROVIDER_ENV)
    dmi_prefixes = ("DMI_BULK_", "CURRENT_FIELD_SHADOW_", "ECCODES_")
    environment = {
        name: value for name, value in environ.items()
        if name in names or (provider == "dmi" and name.startswith(dmi_prefixes))
    }
    environment[PYTHON_EXECUTABLE_KEY] = executable
    if provider == "dmi":
        environment["DMI_BULK_REQUIRE_ORDINARY_CLOSURE"] = "true"
    else:
        environment["RAVRADAR_COPERNICUS_REQUIRE_CLOSURE"] = "true"
    return environment


def provider_command(provider, args, executable):
    script, _ = PROVIDERS[provider]
    require(provider != "dmi" or not args, "PROVIDER_ARGUMENTS_REFUSED")
    require(Path(executable).is_absolute(), "PROVIDER_PYTHON_REQUIRED")
    return [executable, "-u", str(ROOT / "scripts" / script), *args]


def service_entry(provider, args):
    environment = read_environment(0)
    executable = environment.pop(PYTHON_EXECUTABLE_KEY)
    command = provider_command(provider, args, executable)
    require(not poll_fd(0), "PROVIDER_OWNER_ALREADY_GONE")
    main_fd = os.pidfd_open(os.getpid())
    try:
        subprocess.Popen([BOOTSTRAP_PYTHON, "-B", str(SELF), "--watch", str(main_fd)],
                         stdin=0, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                         pass_fds=(main_fd,), env=DRY_ENV)
    finally:
        os.close(main_fd)
    with open(os.devnull, "rb") as empty_input:
        os.dup2(empty_input.fileno(), 0)
    os.execve(command[0], command, environment)


def owned_regular_file(path, flags, expected=None):
    fd = os.open(path, flags | os.O_NOFOLLOW | os.O_CLOEXEC)
    try:
        actual = os.fstat(fd)
        require(stat.S_ISREG(actual.st_mode) and actual.st_uid == os.geteuid()
                and actual.st_nlink == 1 and (expected is None or os.path.samestat(actual, expected)),
                "PROVIDER_OUTPUT_FILE_REFUSED")
        return fd
    except BaseException:
        os.close(fd)
        raise


def staged_channels(scope, runner_temp, environment):
    channels = []
    for name, (prefix, bound) in CHANNELS.items():
        if name not in environment:
            require(name != "GITHUB_OUTPUT", "PROVIDER_OUTPUT_FILE_REQUIRED")
            continue
        target = Path(environment[name])
        expected_directory = runner_temp / "_runner_file_commands"
        require(target.parent == expected_directory and target.parent.resolve(strict=True) == expected_directory
                and target.name.startswith(prefix), "PROVIDER_OUTPUT_PATH_REFUSED")
        with os.fdopen(owned_regular_file(target, os.O_WRONLY), "wb") as original:
            target_identity = os.fstat(original.fileno())
        source = scope / name
        fd = os.open(source, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC, 0o600)
        try:
            source_identity = os.fstat(fd)
        finally:
            os.close(fd)
        channels.append((source, source_identity, target, target_identity, bound))
        environment[name] = str(source)
    return channels


def relay_provider_log(stream, failures):
    # Actions accepts legacy commands even in the middle of a line. Drain both
    # streams, but only the staged output files may report step state.
    try:
        with stream:
            for fragment in iter(lambda: stream.readline(16 * 1024), ""):
                text = fragment.replace("::", ": :").replace("##[", "# #[")
                print(text, end="" if text.endswith("\n") else "\n", flush=True)
    except (OSError, UnicodeError):
        failures.append("PROVIDER_LOG_RELAY_FAILED")


def ferry_closed_channels(provider, channels):
    # Read and validate all channels before forwarding any. Publish the original
    # provider's closure marker last, after the caller proved physical stop.
    collected = []
    marker = PROVIDERS[provider][1]
    for source, source_identity, target, target_identity, limit in channels:
        with os.fdopen(owned_regular_file(source, os.O_RDONLY, source_identity), "rb") as capture:
            data = capture.read(limit + 1)
        require(len(data) <= limit, "PROVIDER_OUTPUT_SIZE_REFUSED")
        collected.append((source.name, target, target_identity, data))
    name, _, _, outputs = collected[0]
    lines = outputs.splitlines(keepends=True)
    require(name == "GITHUB_OUTPUT" and lines and lines[-1] == marker
            and lines.count(marker) == 1 and b"\0" not in outputs,
            "PROVIDER_NATIVE_STOP_RECEIPT_MISSING")
    with ExitStack() as stack:
        destinations = [
            (stack.enter_context(os.fdopen(
                owned_regular_file(path, os.O_WRONLY | os.O_APPEND, identity), "ab")), contents)
            for _, path, identity, contents in [*collected[1:], collected[0]]
        ]
        for destination, contents in destinations:
            destination.write(contents)
            destination.flush()


def systemctl(environment, *args):
    return subprocess.run(["/usr/bin/systemctl", "--user", *args], env=environment,
                          stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
                          stderr=subprocess.DEVNULL, text=True, timeout=2)


def unit_state(environment, unit):
    properties = ("Id,Transient,InvocationID,MainPID,ActiveState,LoadState,ControlGroup,"
                  "Result,ExecMainCode,ExecMainStatus")
    result = systemctl(environment, "show", f"--property={properties}", unit)
    require(result.returncode == 0, "PROVIDER_UNIT_STATE_UNAVAILABLE")
    return dict(line.split("=", 1) for line in result.stdout.splitlines())


def same_unit(state, unit, invocation):
    return (state.get("Id"), state.get("Transient"), state.get("InvocationID")) == (unit, "yes", invocation)


def owned_cgroup(state, unit, uid):
    cgroup = Path(state.get("ControlGroup", ""))
    require(cgroup.is_relative_to(Path(f"/user.slice/user-{uid}.slice/user@{uid}.service"))
            and ".." not in cgroup.parts and cgroup.name == unit,
            "PROVIDER_UNIT_CGROUP_REFUSED")
    group = Path("/sys/fs/cgroup").joinpath(*cgroup.parts[1:])
    main = int(state["MainPID"])
    require(main > 1 and os.fsencode(f"0::{cgroup}")
            in Path(f"/proc/{main}/cgroup").read_bytes().splitlines(),
            "PROVIDER_UNIT_MAIN_UNPROVED")
    require(b"populated 1" in (group / "cgroup.events").read_bytes().splitlines(),
            "PROVIDER_UNIT_CGROUP_NOT_LIVE")
    return group, group.stat()


def physically_closed(group, identity):
    try:
        return (os.path.samestat(group.stat(), identity)
                and b"populated 0" in (group / "cgroup.events").read_bytes().splitlines())
    except FileNotFoundError:
        return not group.exists()


def retire_closed_unit(environment, unit, invocation, group, identity):
    require(physically_closed(group, identity), "PROVIDER_PHYSICAL_STOP_UNPROVED")
    state = unit_state(environment, unit)
    terminal = state
    if state.get("ActiveState") == "failed":
        require(same_unit(state, unit, invocation) and state.get("MainPID") == "0",
                "PROVIDER_FAILED_UNIT_OWNER_UNPROVED")
        systemctl(environment, "reset-failed", unit)
        state = unit_state(environment, unit)
    require(state.get("ActiveState") == "inactive" and (
        state.get("LoadState") == "not-found"
        or (same_unit(state, unit, invocation) and state.get("MainPID") == "0")
    ) and physically_closed(group, identity), "PROVIDER_UNIT_REENTRY_UNPROVED")
    return terminal


def require_controlled_exit(status, state, unit, invocation):
    retired = (state.get("LoadState"), state.get("ActiveState")) == ("not-found", "inactive")
    controlled = same_unit(state, unit, invocation) and state.get("MainPID") == "0"
    if status == 0:
        allowed = retired or (controlled and state.get("Result") == "success")
    else:
        allowed = (0 < status <= 255 and controlled and state.get("Result") == "exit-code"
                   and state.get("ExecMainCode") == str(os.CLD_EXITED)
                   and state.get("ExecMainStatus") == str(status))
    require(allowed, "PROVIDER_WAITER_EXIT_UNPROVED")


def pipe_frame(owner_write, frame, alive):
    remaining = memoryview(frame)
    deadline = time.monotonic() + CONTROL_SECONDS
    watched = select.poll()
    watched.register(owner_write, select.POLLOUT)
    while remaining:
        require(alive() and time.monotonic() < deadline, "PROVIDER_ENV_SEND_REFUSED")
        for _, event in watched.poll(50):
            require(event == select.POLLOUT, "PROVIDER_ENV_PIPE_REFUSED")
            remaining = remaining[os.write(owner_write, remaining):]


def hosted_controller(provider, runtime_seconds, args):
    require(sys.platform == "linux" and os.getenv("RUNNER_ENVIRONMENT") == "github-hosted"
            and os.getenv("ImageOS") == "ubuntu24" and os.geteuid() != 0,
            "PROVIDER_HOSTED_UBUNTU24_REQUIRED")
    provider_command(provider, args, sys.executable)
    uid = os.geteuid()
    bus = Path(f"/run/user/{uid}/bus")
    endpoint = bus.stat()
    require(stat.S_ISSOCK(endpoint.st_mode) and endpoint.st_uid == uid,
            "PROVIDER_USER_BUS_REFUSED")
    control_environment = {**DRY_ENV, "XDG_RUNTIME_DIR": str(bus.parent)}
    runner_temp = Path(os.environ["RUNNER_TEMP"]).resolve(strict=True)
    require(runner_temp.is_dir() and runner_temp.stat().st_uid == uid, "PROVIDER_RUNNER_TEMP_REFUSED")
    pending = None

    def interrupted(signum, _frame):
        nonlocal pending
        pending = pending or signum

    launcher = None
    owner_read = owner_write = parent_fd = None
    scope = None
    group = identity = invocation = None
    scratch_releasable = False
    previous = {}
    try:
        for signum in (signal.SIGINT, signal.SIGTERM):
            previous[signum] = signal.signal(signum, interrupted)
        parent = os.getppid()
        require(parent > 1, "PROVIDER_STEP_PARENT_UNAVAILABLE")
        parent_fd = os.pidfd_open(parent)

        def alive():
            return pending is None and os.getppid() == parent and not poll_fd(parent_fd)

        require(alive(), "PROVIDER_STEP_OWNER_LOST")
        scope = Path(tempfile.mkdtemp(prefix="rr-weather-provider-", dir=runner_temp))
        unit = scope.name + ".service"
        require(unit_state(control_environment, unit).get("LoadState") == "not-found",
                "PROVIDER_UNIT_ALREADY_EXISTS")
        environment = provider_environment(provider, os.environ, sys.executable)
        channels = staged_channels(scope, runner_temp, environment)
        frame = environment_frame(environment)
        owner_read, owner_write = os.pipe2(os.O_CLOEXEC)
        os.set_blocking(owner_write, False)
        properties = ["ExitType=main", "KillMode=mixed", f"TimeoutStopSec={OWNER_GRACE_SECONDS}s",
                      f"RuntimeMaxSec={runtime_seconds}s", "Restart=no", "NoNewPrivileges=yes",
                      f"WorkingDirectory={ROOT}"]
        launcher = subprocess.Popen(
            ["/usr/bin/systemd-run", "--user", "--quiet", "--pipe", "--wait",
             "--service-type=exec", "--expand-environment=no", f"--unit={unit}",
             *[f"--property={item}" for item in properties],
             "--", "/usr/bin/env", "-i", "PATH=/usr/bin:/bin", "LANG=C.UTF-8",
             BOOTSTRAP_PYTHON, "-B", str(SELF), "--unit", provider, *args],
            stdin=owner_read, env=control_environment, start_new_session=True,
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
            encoding="utf-8", errors="replace",
        )
        log_failures = []
        log_relay = threading.Thread(target=relay_provider_log, args=(launcher.stdout, log_failures), daemon=True)
        log_relay.start()
        os.close(owner_read)
        owner_read = None
        deadline = time.monotonic() + CONTROL_SECONDS
        while alive() and launcher.poll() is None and time.monotonic() < deadline:
            state = unit_state(control_environment, unit)
            if state.get("ActiveState") == "active":
                invocation = state.get("InvocationID")
                require(invocation and len(invocation) == 32 and int(invocation, 16) != 0
                        and same_unit(state, unit, invocation),
                        "PROVIDER_UNIT_OWNER_UNPROVED")
                expected = [BOOTSTRAP_PYTHON, "-B", str(SELF), "--unit", provider, *args]
                actual = Path(f"/proc/{int(state['MainPID'])}/cmdline").read_bytes().split(b"\0")[:-1]
                if actual != [os.fsencode(item) for item in expected]:
                    time.sleep(0.05)  # Type=exec can observe env(1) just before its exec.
                    continue
                group, identity = owned_cgroup(state, unit, uid)
                break
            time.sleep(0.05)
        require(group is not None and alive() and launcher.poll() is None,
                "PROVIDER_UNIT_START_UNPROVED")
        print("WEATHER_PROVIDER_CGROUP_READY", flush=True)
        pipe_frame(owner_write, frame, alive)
        while alive() and launcher.poll() is None:
            time.sleep(0.05)
        normal_wait = alive()
        if pending is not None:
            try:
                os.write(owner_write, b"I" if pending == signal.SIGINT else b"T")
            except OSError:
                pass
        os.close(owner_write)
        owner_write = None
        deadline = time.monotonic() + CONTROL_SECONDS + OWNER_GRACE_SECONDS
        while not physically_closed(group, identity) and time.monotonic() < deadline:
            time.sleep(0.05)
        require(physically_closed(group, identity), "PROVIDER_PHYSICAL_STOP_UNPROVED")
        status = launcher.wait(timeout=2)
        terminal = retire_closed_unit(control_environment, unit, invocation, group, identity)
        log_relay.join(timeout=2)
        require(not log_relay.is_alive() and not log_failures, "PROVIDER_LOG_RELAY_UNPROVED")
        print("WEATHER_PROVIDER_CGROUP_CLOSED", flush=True)
        if not normal_wait or not alive():
            scratch_releasable = True
            return 128 + int(pending) if pending is not None else 1
        require_controlled_exit(status, terminal, unit, invocation)
        ferry_closed_channels(provider, channels)
        scratch_releasable = True
        return status
    finally:
        for fd in (owner_read, owner_write, parent_fd):
            if fd is not None:
                os.close(fd)
        if scope is not None and (launcher is None or scratch_releasable):
            # This fixed scratch contains only the staged GitHub output files.
            for channel in CHANNELS:
                (scope / channel).unlink(missing_ok=True)
            scope.rmdir()
        for signum, handler in previous.items():
            signal.signal(signum, handler)


def main(arguments):
    if len(arguments) == 2 and arguments[0] == "--watch":
        return watch_owner(int(arguments[1]))
    if len(arguments) >= 2 and arguments[0] == "--unit":
        return service_entry(arguments[1], arguments[2:])
    require(len(arguments) >= 3 and arguments[2] == "--", "PROVIDER_ARGUMENTS_REFUSED")
    kind, seconds, _, *args = arguments
    runtime_seconds = int(seconds)
    require(kind in PROVIDERS and 60 <= runtime_seconds <= 70 * 60, "PROVIDER_ARGUMENTS_REFUSED")
    return hosted_controller(kind, runtime_seconds, args)


if __name__ == "__main__":
    try:
        result = main(sys.argv[1:])
    except (KeyError, RuntimeError, OSError, ValueError, subprocess.SubprocessError) as failure:
        reason = str(failure) if isinstance(failure, ProviderRefused) else "PROVIDER_CGROUP_REFUSED"
        print(reason, file=sys.stderr, flush=True)
        result = 1
    raise SystemExit(result)
