$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$assetDir = Join-Path $root "assets"
New-Item -ItemType Directory -Force $assetDir | Out-Null

function New-GradientBitmap {
  param(
    [int]$Width,
    [int]$Height,
    [string]$Path
  )

  $bitmap = [System.Drawing.Bitmap]::new($Width, $Height)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

  try {
    $rect = [System.Drawing.Rectangle]::new(0, 0, $Width, $Height)
    $brush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
      $rect,
      [System.Drawing.Color]::FromArgb(255, 15, 18, 24),
      [System.Drawing.Color]::FromArgb(255, 39, 34, 45),
      18
    )
    $graphics.FillRectangle($brush, $rect)
    $brush.Dispose()

    $rand = [Random]::new(42)
    for ($i = 0; $i -lt 120; $i++) {
      $alpha = 18 + $rand.Next(28)
      $color = if ($i % 3 -eq 0) {
        [System.Drawing.Color]::FromArgb($alpha, 76, 214, 194)
      } elseif ($i % 3 -eq 1) {
        [System.Drawing.Color]::FromArgb($alpha, 246, 189, 96)
      } else {
        [System.Drawing.Color]::FromArgb($alpha, 242, 132, 130)
      }
      $pen = [System.Drawing.Pen]::new($color, 1 + $rand.NextDouble() * 2)
      $x1 = $rand.NextDouble() * $Width
      $y1 = $rand.NextDouble() * $Height
      $x2 = $x1 + ($rand.NextDouble() - 0.5) * $Width * 0.38
      $y2 = $y1 + ($rand.NextDouble() - 0.5) * $Height * 0.38
      $graphics.DrawLine($pen, [float]$x1, [float]$y1, [float]$x2, [float]$y2)
      $pen.Dispose()
    }

    for ($r = 0; $r -lt 5; $r++) {
      $diameter = [int]($Width * (0.18 + $r * 0.06))
      $x = [int]($Width * (0.1 + $r * 0.13))
      $y = [int]($Height * (0.16 + ($r % 2) * 0.42))
      $color = [System.Drawing.Color]::FromArgb(18, 76, 214, 194)
      $halo = [System.Drawing.SolidBrush]::new($color)
      $graphics.FillEllipse($halo, $x, $y, $diameter, $diameter)
      $halo.Dispose()
    }

    $overlay = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(78, 0, 0, 0))
    $graphics.FillRectangle($overlay, 0, 0, $Width, $Height)
    $overlay.Dispose()

    $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  }
  finally {
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

New-GradientBitmap -Width 1920 -Height 1080 -Path (Join-Path $assetDir "default-background.png")
New-GradientBitmap -Width 640 -Height 360 -Path (Join-Path $assetDir "preview.png")
