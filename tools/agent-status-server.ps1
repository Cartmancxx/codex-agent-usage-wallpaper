param(
  [int]$Port = 47621,
  [string]$DataFile = "",
  [string]$Path = "/status"
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($DataFile)) {
  $root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
  $local = Join-Path $root "agent-status.local.json"
  $sample = Join-Path $root "agent-status.sample.json"
  $DataFile = if (Test-Path -LiteralPath $local) { $local } else { $sample }
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse("127.0.0.1"), $Port)
$listener.Start()
$prefix = "http://127.0.0.1:$Port/"

Write-Host "Agent status server: $prefix"
Write-Host "Serving: $DataFile"
Write-Host "Wallpaper data URL: http://127.0.0.1:$Port$Path"
Write-Host "Press Ctrl+C to stop."

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    $stream = $client.GetStream()
    $reader = [System.IO.StreamReader]::new($stream, [Text.Encoding]::ASCII, $false, 1024, $true)
    $requestLine = $reader.ReadLine()
    while ($true) {
      $line = $reader.ReadLine()
      if ($null -eq $line -or $line.Length -eq 0) { break }
    }

    if ([string]::IsNullOrWhiteSpace($requestLine)) {
      $client.Close()
      continue
    }

    $parts = $requestLine.Split(" ")
    $method = if ($parts.Length -gt 0) { $parts[0] } else { "GET" }
    $requestPath = if ($parts.Length -gt 1) { $parts[1].Split("?")[0] } else { "/" }

    if ($method -eq "OPTIONS") {
      $header = "HTTP/1.1 204 No Content`r`nAccess-Control-Allow-Origin: *`r`nAccess-Control-Allow-Methods: GET, OPTIONS`r`nAccess-Control-Allow-Headers: Content-Type`r`nContent-Length: 0`r`nConnection: close`r`n`r`n"
      $headerBytes = [Text.Encoding]::ASCII.GetBytes($header)
      $stream.Write($headerBytes, 0, $headerBytes.Length)
      $client.Close()
      continue
    }

    if ($requestPath -ne $Path) {
      $status = "404 Not Found"
      $json = "{`"error`":`"not found`"}"
    } else {
      $status = "200 OK"
      if (Test-Path -LiteralPath $DataFile) {
        $json = Get-Content -LiteralPath $DataFile -Raw -Encoding UTF8
      } else {
        $json = "{`"provider`":`"Codex`",`"updatedAt`":`"$([DateTimeOffset]::Now.ToString("o"))`",`"quota`":{`"mode`":`"percent`",`"label`":`"1周`",`"usedPercent`":0,`"remainingPercent`":100,`"windows`":[{`"label`":`"5小时`",`"usedPercent`":0,`"remainingPercent`":100},{`"label`":`"1周`",`"usedPercent`":0,`"remainingPercent`":100}]},`"tokens`":{`"week`":0,`"month`":0},`"agents`":[]}"
      }
    }

    $bytes = [Text.Encoding]::UTF8.GetBytes($json)
    $header = "HTTP/1.1 $status`r`nContent-Type: application/json; charset=utf-8`r`nAccess-Control-Allow-Origin: *`r`nCache-Control: no-store`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`n`r`n"
    $headerBytes = [Text.Encoding]::ASCII.GetBytes($header)
    $stream.Write($headerBytes, 0, $headerBytes.Length)
    $stream.Write($bytes, 0, $bytes.Length)
    $client.Close()
  }
}
finally {
  $listener.Stop()
}
