[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

function ConvertFrom-RavRadarSecureString {
  param([Parameter(Mandatory)][Security.SecureString]$Value)
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
}

$accountSecure = Read-Host 'Cloudflare Account ID (indtastningen skjules)' -AsSecureString
$tokenSecure = Read-Host 'Workers AI API-token (indtastningen skjules)' -AsSecureString
$freeConfirmation = Read-Host 'Skriv GRATIS for at bekræfte Workers Free uden betalt overforbrug'
if ($freeConfirmation -cne 'GRATIS') {
  throw 'Evalen blev afbrudt: Workers Free blev ikke bekræftet.'
}

$dependenciesRoot = if ([string]::IsNullOrWhiteSpace($env:CODEX_DEPENDENCIES_ROOT)) {
  Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies'
} else {
  $env:CODEX_DEPENDENCIES_ROOT
}
$node = Join-Path $dependenciesRoot 'node\bin\node.exe'
if (-not (Test-Path -LiteralPath $node)) {
  throw "Codex Node-runtime mangler: $node"
}

$accountId = ConvertFrom-RavRadarSecureString $accountSecure
$apiToken = ConvertFrom-RavRadarSecureString $tokenSecure
if ([string]::IsNullOrWhiteSpace($accountId) -or [string]::IsNullOrWhiteSpace($apiToken)) {
  throw 'Account ID og API-token skal begge udfyldes.'
}

$repositoryRoot = Split-Path -Parent $PSScriptRoot
Push-Location $repositoryRoot
try {
  $env:CLOUDFLARE_ACCOUNT_ID = $accountId
  $env:CLOUDFLARE_WORKERS_AI_TOKEN = $apiToken
  $env:CLOUDFLARE_WORKERS_FREE_CONFIRMED = '1'
  & $node scripts/run-rav-assistant-model-evals.mjs --live --provider=cloudflare
  $exitCode = $LASTEXITCODE
} finally {
  Remove-Item Env:CLOUDFLARE_ACCOUNT_ID -ErrorAction SilentlyContinue
  Remove-Item Env:CLOUDFLARE_WORKERS_AI_TOKEN -ErrorAction SilentlyContinue
  Remove-Item Env:CLOUDFLARE_WORKERS_FREE_CONFIRMED -ErrorAction SilentlyContinue
  $accountId = $null
  $apiToken = $null
  Pop-Location
}

exit $exitCode
