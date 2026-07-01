$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType=WindowsRuntime]
$null = [Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType=WindowsRuntime]

function Await-Operation {
  param(
    [Parameter(Mandatory=$true)] $AsyncInfo,
    [Parameter(Mandatory=$true)] [Type] $ResultType
  )

  $method = [System.WindowsRuntimeSystemExtensions].GetMethods() |
    Where-Object {
      $_.Name -eq "AsTask" -and
      $_.IsGenericMethodDefinition -and
      $_.GetParameters().Count -eq 1
    } |
    Select-Object -First 1

  $task = $method.MakeGenericMethod($ResultType).Invoke($null, @($AsyncInfo))
  $task.Wait()
  return $task.Result
}

function Empty-Media {
  [ordered]@{
    title = ""
    artist = ""
    albumTitle = ""
    app = ""
    isPlaying = $false
    status = "Unavailable"
    thumbnail = ""
    updatedAt = [DateTimeOffset]::Now.ToString("o")
  } | ConvertTo-Json -Depth 4 -Compress
}

try {
  $manager = Await-Operation `
    ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) `
    ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
  $session = $manager.GetCurrentSession()
  if ($null -eq $session) {
    Empty-Media
    exit 0
  }

  $props = Await-Operation `
    ($session.TryGetMediaPropertiesAsync()) `
    ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
  $playback = $session.GetPlaybackInfo()
  $status = if ($playback) { $playback.PlaybackStatus.ToString() } else { "Unknown" }
  $thumbnailData = ""

  if ($props.Thumbnail) {
    try {
      $stream = Await-Operation `
        ($props.Thumbnail.OpenReadAsync()) `
        ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
      $reader = [Windows.Storage.Streams.DataReader]::new($stream)
      $loaded = Await-Operation ($reader.LoadAsync([uint32]$stream.Size)) ([uint32])
      $bytes = New-Object byte[] $loaded
      $reader.ReadBytes($bytes)
      $mime = if ($stream.ContentType) { $stream.ContentType } else { "image/jpeg" }
      $thumbnailData = "data:$mime;base64,$([Convert]::ToBase64String($bytes))"
    } catch {
      $thumbnailData = ""
    }
  }

  [ordered]@{
    title = $props.Title
    artist = $props.Artist
    albumTitle = $props.AlbumTitle
    app = $session.SourceAppUserModelId
    isPlaying = ($status -eq "Playing")
    status = $status
    thumbnail = $thumbnailData
    updatedAt = [DateTimeOffset]::Now.ToString("o")
  } | ConvertTo-Json -Depth 4 -Compress
} catch {
  Empty-Media
}
