Add-Type -AssemblyName System.Drawing

$srcPath = "e:\Wbsite Antigravity\New User app\public\App icon.png"
if (-not (Test-Path $srcPath)) {
    Write-Error "Source image not found: $srcPath"
    exit 1
}

$sourceImg = [System.Drawing.Image]::FromFile($srcPath)
Write-Host "Source image loaded: $($sourceImg.Width)x$($sourceImg.Height)"

function Resize-And-Save($img, $width, $height, $destPath) {
    $parentDir = Split-Path -Parent $destPath
    if (-not (Test-Path $parentDir)) {
        New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
    }
    
    $destBitmap = New-Object System.Drawing.Bitmap($width, $height)
    $graphics = [System.Drawing.Graphics]::FromImage($destBitmap)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.DrawImage($img, 0, 0, $width, $height)
    $graphics.Dispose()
    
    $destBitmap.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destBitmap.Dispose()
    Write-Host "Saved: $destPath ($width x $height)"
}

function Create-Foreground-Icon($img, $canvasSize, $destPath) {
    $parentDir = Split-Path -Parent $destPath
    if (-not (Test-Path $parentDir)) {
        New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
    }
    
    $destBitmap = New-Object System.Drawing.Bitmap($canvasSize, $canvasSize)
    $graphics = [System.Drawing.Graphics]::FromImage($destBitmap)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $iconSize = [int]($canvasSize * 0.72)
    $offset = [int](($canvasSize - $iconSize) / 2)
    $graphics.DrawImage($img, $offset, $offset, $iconSize, $iconSize)
    $graphics.Dispose()
    
    $destBitmap.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destBitmap.Dispose()
    Write-Host "Saved Foreground: $destPath ($canvasSize x $canvasSize)"
}

$androidSizes = @{
    "mipmap-mdpi" = 48
    "mipmap-hdpi" = 72
    "mipmap-xhdpi" = 96
    "mipmap-xxhdpi" = 144
    "mipmap-xxxhdpi" = 192
}

$androidFgSizes = @{
    "mipmap-mdpi" = 108
    "mipmap-hdpi" = 162
    "mipmap-xhdpi" = 216
    "mipmap-xxhdpi" = 324
    "mipmap-xxxhdpi" = 432
}

$appPaths = @(
    "packages\user",
    "packages\driver"
)

foreach ($app in $appPaths) {
    Write-Host "`nGenerating icons for $app..."
    
    # 1. Android Icons
    $resPath = Join-Path "e:\Wbsite Antigravity\New User app\$app" "android\app\src\main\res"
    if (Test-Path $resPath) {
        foreach ($folder in $androidSizes.Keys) {
            $sz = $androidSizes[$folder]
            $fgSz = $androidFgSizes[$folder]
            $folderPath = Join-Path $resPath $folder
            
            Resize-And-Save $sourceImg $sz $sz (Join-Path $folderPath "ic_launcher.png")
            Resize-And-Save $sourceImg $sz $sz (Join-Path $folderPath "ic_launcher_round.png")
            Create-Foreground-Icon $sourceImg $fgSz (Join-Path $folderPath "ic_launcher_foreground.png")
        }
    }
    
    # 2. iOS AppIcon
    $iosPath = Join-Path "e:\Wbsite Antigravity\New User app\$app" "ios\App\App\Assets.xcassets\AppIcon.appiconset"
    if (Test-Path $iosPath) {
        Resize-And-Save $sourceImg 1024 1024 (Join-Path $iosPath "AppIcon-512@2x.png")
    }
}

$sourceImg.Dispose()
Write-Host "`nAll App icons generated successfully!"
