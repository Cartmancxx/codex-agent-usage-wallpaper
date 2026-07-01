param(
  [string]$TaskName = "CodexUsageWallpaperServer",
  [int]$Port = 47622
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$script = Join-Path $root "tools\codex-usage-export.py"
$resolver = Join-Path $root "tools\resolve-python.ps1"

if (-not (Test-Path -LiteralPath $resolver)) {
  throw "Missing script: $resolver"
}
. $resolver
$python = Resolve-CodexUsagePython

if (-not (Test-Path -LiteralPath $script)) {
  throw "Missing script: $script"
}

$argument = "`"$script`" --serve $Port"

try {
  $action = New-ScheduledTaskAction -Execute $python -Argument $argument -WorkingDirectory $root
  $trigger = New-ScheduledTaskTrigger -AtLogOn
  $settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit (New-TimeSpan -Seconds 0)

  Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "Local Codex usage endpoint for Wallpaper Engine at http://127.0.0.1:$Port/status" `
    -Force | Out-Null

  Start-ScheduledTask -TaskName $TaskName
  Write-Host "Installed scheduled task: $TaskName"
} catch {
  Write-Host "Scheduled task install failed, falling back to Startup folder: $($_.Exception.Message)"
  $startup = [Environment]::GetFolderPath("Startup")
  if (-not (Test-Path -LiteralPath $startup)) {
    New-Item -ItemType Directory -Force -Path $startup | Out-Null
  }
  $launcher = Join-Path $startup "$TaskName.vbs"
  $pythonVbs = $python.Replace('"', '""')
  $scriptVbs = $script.Replace('"', '""')
  $vbs = @"
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run """" & "$pythonVbs" & """" & " " & """" & "$scriptVbs" & """" & " --serve $Port", 0, False
"@
  Set-Content -LiteralPath $launcher -Value $vbs -Encoding ASCII
  Start-Process -FilePath "wscript.exe" -ArgumentList "`"$launcher`"" -WindowStyle Hidden
  Write-Host "Installed Startup launcher: $launcher"
}

Write-Host "Endpoint: http://127.0.0.1:$Port/status"
Write-Host "Wallpaper Engine refresh interval is controlled by the wallpaper property '刷新间隔（秒）'."
