[CmdletBinding()]
param([string]$DependenciesRoot = $env:CODEX_DEPENDENCIES_ROOT)

$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($DependenciesRoot)) {
  $DependenciesRoot = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies'
}
$repoRoot = Split-Path -Parent $PSScriptRoot
$nodeDir = Join-Path $DependenciesRoot 'node\bin'
$pythonDir = Join-Path $DependenciesRoot 'python'
$pythonScripts = Join-Path $pythonDir 'Scripts'
$overrideDir = Join-Path $DependenciesRoot 'bin\override'
$fallbackDir = Join-Path $DependenciesRoot 'bin\fallback'
$pnpm = Join-Path $fallbackDir 'pnpm.cmd'
$python = Join-Path $pythonDir 'python.exe'
foreach ($tool in @((Join-Path $nodeDir 'node.exe'), $pnpm, $python)) {
  if (-not (Test-Path -LiteralPath $tool)) {
    throw "Codex runtime tool is missing: $tool"
  }
}

$shimDir = Join-Path $env:TEMP 'ravradar-codex-bin'
New-Item -ItemType Directory -Path $shimDir -Force | Out-Null
$npmShim = Join-Path $shimDir 'npm.cmd'
Set-Content -LiteralPath $npmShim -Encoding Ascii -Value ('@call "' + $pnpm + '" %*')
$env:PATH = @($shimDir, $nodeDir, $pythonDir, $pythonScripts, $overrideDir, $fallbackDir, $env:PATH) -join ';'

$dependencyCheck = "import importlib.util, sys; names = ('requests', 'eccodes', 'shapely', 'pyproj', 'copernicusmarine', 'xarray', 'PIL'); missing = [name for name in names if importlib.util.find_spec(name) is None]; print('Missing Python packages: ' + ', '.join(missing)) if missing else None; sys.exit(1 if missing else 0)"
& $python -c $dependencyCheck
if ($LASTEXITCODE -ne 0) {
  throw 'Codex Python dependencies are incomplete. Run scripts\setup-codex.ps1.'
}

Push-Location $repoRoot
try {
  & $pnpm run validate:source
  $exitCode = $LASTEXITCODE
} finally {
  Pop-Location
}
exit $exitCode
