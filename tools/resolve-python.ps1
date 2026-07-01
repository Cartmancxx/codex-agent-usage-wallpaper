function Resolve-CodexUsagePython {
  $candidates = New-Object System.Collections.Generic.List[string]

  if ($env:CODEX_USAGE_PYTHON) {
    $candidates.Add($env:CODEX_USAGE_PYTHON)
  }

  $profiles = @(
    $env:USERPROFILE,
    [Environment]::GetFolderPath("UserProfile"),
    $HOME
  ) | Where-Object { $_ } | Select-Object -Unique

  foreach ($profile in $profiles) {
    $candidates.Add((Join-Path $profile ".cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"))
    Get-ChildItem -LiteralPath (Join-Path $profile ".cache\codex-runtimes") -Filter python.exe -Recurse -ErrorAction SilentlyContinue |
      Where-Object { $_.FullName -like "*\dependencies\python\python.exe" } |
      ForEach-Object { $candidates.Add($_.FullName) }
  }

  $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
  if ($pythonCommand -and $pythonCommand.Source) {
    $candidates.Add($pythonCommand.Source)
  }

  foreach ($candidate in $candidates | Select-Object -Unique) {
    if ($candidate -and (Test-Path -LiteralPath $candidate)) {
      return (Resolve-Path -LiteralPath $candidate).Path
    }
  }

  throw "Python was not found. Install Python 3.11+ or set CODEX_USAGE_PYTHON to python.exe."
}
