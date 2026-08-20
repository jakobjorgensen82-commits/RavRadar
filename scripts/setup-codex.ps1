[CmdletBinding()]
param([string]$DependenciesRoot = $env:CODEX_DEPENDENCIES_ROOT)

$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($DependenciesRoot)) {
  $DependenciesRoot = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies'
}
$repoRoot = Split-Path -Parent $PSScriptRoot
$node = Join-Path $DependenciesRoot 'node\bin\node.exe'
$pnpm = Join-Path $DependenciesRoot 'bin\fallback\pnpm.cmd'
$python = Join-Path $DependenciesRoot 'python\python.exe'
foreach ($tool in @($node, $pnpm, $python)) {
  if (-not (Test-Path -LiteralPath $tool)) {
    throw "Codex runtime tool is missing: $tool"
  }
}

Push-Location $repoRoot
try {
  & $python -m pip install --quiet --disable-pip-version-check -r requirements-dmi.txt -r requirements-geometry.txt -r requirements-copernicus.txt
  if ($LASTEXITCODE -ne 0) { throw 'Python dependency installation failed.' }
} finally {
  Pop-Location
}
Write-Host 'Codex runtime is ready. Run scripts\validate-source.ps1 next.'