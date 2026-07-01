param(
  [string]$TaskName = "CodexUsageWallpaperServer"
)

$ErrorActionPreference = "Stop"

try {
  $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  if ($task) {
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Removed scheduled task: $TaskName"
  } else {
    Write-Host "Scheduled task not found: $TaskName"
  }
} catch {
  Write-Host "Could not remove scheduled task: $($_.Exception.Message)"
}

$startup = [Environment]::GetFolderPath("Startup")
$launcher = Join-Path $startup "$TaskName.vbs"
if (Test-Path -LiteralPath $launcher) {
  Remove-Item -LiteralPath $launcher -Force
  Write-Host "Removed Startup launcher: $launcher"
}
