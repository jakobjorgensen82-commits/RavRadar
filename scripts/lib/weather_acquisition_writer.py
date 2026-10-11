"""Internal cooperative claim, fixed to this module's checkout.

No PID/expiry/adoption, caller root, serialized credential or executor. Every
participant must leave another owner's claim untouched. Identity checks plus
unlink are NOT atomic against hostile same-privilege filesystem replacement.
This primitive proves ONLY its own claim lifetime, not producer quiescence,
cohort closure or SAVE. Callers must retain on unknown resource settlement.
There is deliberately no context manager or automatic release on exception.
"""

import errno
import os
import stat
import threading
import weakref


_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
_CACHE = os.path.join(_ROOT, ".cache")
_CLAIM = os.path.join(_CACHE, "weather-acquisition-writer.claim")
_PROCESS = os.getpid()
_LOCK = threading.RLock()
_LEASES = weakref.WeakKeyDictionary()
_active = None


class WeatherAcquisitionWriterError(RuntimeError):
    def __init__(self, code="WEATHER_ACQUISITION_WRITER_UNPROVED"):
        super().__init__(code)
        self.code = code


class _Owner:
    __slots__ = ("__weakref__",)


def _failure(code="WEATHER_ACQUISITION_WRITER_UNPROVED"):
    return WeatherAcquisitionWriterError(code)


def _process():
    # An inherited Python object after fork is not ownership in the child.
    if os.getpid() != _PROCESS:
        raise _failure("WEATHER_ACQUISITION_WRITER_OWNER_INVALID")


def _owned(owner):
    if type(owner) is not _Owner or owner not in _LEASES:
        raise _failure("WEATHER_ACQUISITION_WRITER_OWNER_INVALID")
    return _LEASES[owner]


def _current(lease):
    _process()
    if _active is not lease or lease["blocked"] or lease["state"] == "CLOSED":
        raise _failure()


def _same(left, right):
    return (type(left) is os.stat_result and type(right) is os.stat_result
            and left.st_ino > 0 and left.st_dev == right.st_dev
            and left.st_ino == right.st_ino)


def _reparse(value):
    return bool(getattr(value, "st_file_attributes", 0)
                & getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0))


def _directories(lease, capture=False):
    for path, key in ((_ROOT, "root"), (_CACHE, "cache")):
        value = os.lstat(path)
        _current(lease)
        if (not stat.S_ISDIR(value.st_mode) or _reparse(value)
                or value.st_ino <= 0 or os.path.realpath(path) != path):
            raise _failure()
        _current(lease)
        if capture:
            lease[key] = value
        elif not _same(value, lease[key]):
            raise _failure()


def _empty_same(value, original):
    return (_same(value, original) and stat.S_ISREG(value.st_mode)
            and not _reparse(value) and value.st_size == 0
            and value.st_nlink == 1 and value.st_mtime_ns == original.st_mtime_ns)


def _physical(lease):
    _current(lease)
    _directories(lease)
    value = os.lstat(_CLAIM)
    _current(lease)
    if not _empty_same(value, lease["identity"]):
        raise _failure()
    if not lease["closed"]:
        opened = os.fstat(lease["fd"])
        _current(lease)
        if not _empty_same(opened, value):
            raise _failure()


def acquire_weather_acquisition_writer():
    """Acquire the existing checkout/cache's exclusive empty claim, or refuse."""
    global _active
    _process()
    with _LOCK:
        if _active is not None:
            raise _failure("WEATHER_ACQUISITION_WRITER_BUSY")
        lease = {"state": "ACQUIRING", "blocked": False, "closed": False, "fd": None}
        _active = lease
        try:
            _directories(lease, capture=True)  # Never mkdir or adopt an old claim.
            lease["fd"] = os.open(_CLAIM, os.O_WRONLY | os.O_CREAT | os.O_EXCL
                                  | getattr(os, "O_NOFOLLOW", 0), 0o600)
            if type(lease["fd"]) is not int or lease["fd"] < 0:
                raise _failure()
            lease["identity"] = os.fstat(lease["fd"])
            _physical(lease)
            owner = _Owner()
            _LEASES[owner] = lease
            lease["state"] = "OWNED"
            return owner
        except BaseException:
            if lease["fd"] is not None:
                lease["blocked"] = True  # Keep a partly verified actual resource.
            elif _active is lease:
                _active = None
            raise


def assert_weather_acquisition_writer(owner):
    _process()
    with _LOCK:
        lease = _owned(owner)
        try:
            if lease["state"] != "OWNED":
                raise _failure()
            _physical(lease)
        except BaseException:
            lease["blocked"] = True
            raise


def retain_weather_acquisition_writer(owner):
    """Irreversibly retain uncertainty; this never authorizes another writer."""
    _process()
    with _LOCK:
        lease = _owned(owner)
        if lease["state"] == "CLOSED":
            raise _failure()
        lease["blocked"] = True


def release_weather_acquisition_writer(owner):
    """One own-only close/unlink attempt, with physical closure and absence."""
    global _active
    _process()
    with _LOCK:
        lease = _owned(owner)
        if lease["state"] != "OWNED":
            raise _failure()
        lease["state"] = "RELEASING"
        primary = None  # Tuple presence, never exception truthiness.
        try:
            _physical(lease)
            try:
                os.close(lease["fd"])
            except BaseException as error:
                primary = (error,)
            closed = False
            try:
                os.fstat(lease["fd"])
            except BaseException as error:
                # Builtin raw EBADF only; inherited/custom errno is not evidence.
                closed = type(error) is OSError and error.errno == errno.EBADF
            if not closed:
                raise _failure("WEATHER_ACQUISITION_WRITER_CLOSE_UNPROVED")
            lease["closed"] = True
            _physical(lease)
            try:
                os.unlink(_CLAIM)
            except BaseException as error:
                if primary is None:
                    primary = (error,)
            absent = False
            try:
                os.lstat(_CLAIM)
            except BaseException as error:
                if type(error) is FileNotFoundError and error.errno == errno.ENOENT:
                    absent = True
                else:
                    raise
            if not absent:
                raise _failure("WEATHER_ACQUISITION_WRITER_RELEASE_UNPROVED")
            _current(lease)
            _directories(lease)
            lease["state"] = "CLOSED"
            _active = None
        except BaseException as error:
            lease["blocked"] = True
            if primary is None:
                primary = (error,)
        if primary is not None:
            raise primary[0]
