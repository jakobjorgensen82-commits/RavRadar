// The fixed offline CP/current-donor readers need interpreter/library discovery, locale and
// temporary storage, not the parent's provider, GitHub or progress-master keys.
// This is an environment allowlist, NOT filesystem/network/process isolation.
// The caller still chooses its existing Python executable and invocation.
const RUNTIME_KEYS = Object.freeze([
  'PATH', 'TEMP', 'TMP', 'TMPDIR', 'SystemRoot', 'WINDIR',
  'LANG', 'LC_ALL', 'LC_CTYPE', 'TZ', 'LD_LIBRARY_PATH', 'DYLD_LIBRARY_PATH',
  // Preserve the runner's existing cleanup marker, not a stop receipt.
  'RUNNER_TRACKING_ID',
]);

export function copernicusOfflineEnvironment(source = process.env) {
  const environment = {};
  for (const key of RUNTIME_KEYS) {
    const value = source[key];
    if (typeof value === 'string') environment[key] = value;
  }
  environment.PYTHONUTF8 = '1';
  return environment;
}
