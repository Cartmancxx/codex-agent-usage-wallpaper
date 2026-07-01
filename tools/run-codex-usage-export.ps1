param(
  [int]$Serve = 0,
  [string]$Output = "",
  [string]$CodexHome = "",
  [string]$Timezone = "Asia/Shanghai"
)

$ErrorActionPreference = "Stop"

$toolsRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $toolsRoot "resolve-python.ps1")

$root = Split-Path -Parent $toolsRoot
$script = Join-Path $toolsRoot "codex-usage-export.py"
$python = Resolve-CodexUsagePython

$argsList = @($script, "--timezone", $Timezone)
if ($CodexHome) {
  $argsList += @("--codex-home", $CodexHome)
}
if ($Serve -gt 0) {
  $argsList += @("--serve", [string]$Serve)
}
if ($Output) {
  $argsList += @("--output", $Output)
}

Push-Location $root
try {
  & $python @argsList
  exit $LASTEXITCODE
} finally {
  Pop-Location
}
