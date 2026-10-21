Add-Type -AssemblyName System.Drawing

$userSrcPath = Join-Path $PSScriptRoot "..\public\App icon.png"
$driverSrcPath = Join-Path $PSScriptRoot "..\public\Drivers\Drivers App icon.png"

if (-not (Test-Path $userSrcPath)) {
    Write-Error "User source icon not found at $userSrcPath"
    exit 1
}

$userSrc = [System.Drawing.Bitmap]::new($userSrcPath)
$driverSrc = if (Test-Path $driverSrcPath) { [System.Drawing.Bitmap]::new($driverSrcPath) } else { $userSrc }

function Resize-Image($srcImg, $width, $height, $destPath) {
    $parent = Split-Path -Parent $destPath
    if (-not (Test-Path $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }
    $destBmp = New-Object System.Drawing.Bitmap($width, $height)
    $g = [System.Drawing.Graphics]::FromImage($destBmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($srcImg, 0, 0, $width, $height)
    $destBmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $destBmp.Dispose()
    Write-Host "Generated: $destPath ($width x $height)"
}

# Standard Android Notification small icon sizes (dp)
$smallIconSizes = @{
    "drawable-mdpi"    = 24
    "drawable-hdpi"    = 36
    "drawable-xhdpi"   = 48
    "drawable-xxhdpi"  = 72
    "drawable-xxxhdpi" = 96
    "drawable"         = 48
}

# Android Large Icon & App Icon sizes
$appIconSizes = @{
    "mipmap-mdpi"    = 48
    "mipmap-hdpi"    = 72
    "mipmap-xhdpi"   = 96
    "mipmap-xxhdpi"  = 144
    "mipmap-xxxhdpi" = 192
}

$targets = @(
    @{
        ResDir = Join-Path $PSScriptRoot "..\packages\user\android\app\src\main\res"
        Src    = $userSrc
    },
    @{
        ResDir = Join-Path $PSScriptRoot "..\packages\driver\android\app\src\main\res"
        Src    = $driverSrc
    }
)

foreach ($target in $targets) {
    $resDir = $target.ResDir
    $src = $target.Src
    if (-not (Test-Path $resDir)) { continue }

    # 1. Generate small notification icon in all drawable folders
    foreach ($entry in $smallIconSizes.GetEnumerator()) {
        $folder = Join-Path $resDir $entry.Key
        $size = $entry.Value
        Resize-Image $src $size $size (Join-Path $folder "ic_stat_icon_config_sample.png")
        Resize-Image $src $size $size (Join-Path $folder "ic_stat_ridingo.png")
    }

    # 2. Generate large notification icon in drawable/
    Resize-Image $src 192 192 (Join-Path $resDir "drawable\app_icon.png")
    Resize-Image $src 96 96 (Join-Path $resDir "drawable\ic_notification.png")

    # 3. Generate launcher icons in all mipmap folders
    foreach ($entry in $appIconSizes.GetEnumerator()) {
        $folder = Join-Path $resDir $entry.Key
        $size = $entry.Value
        Resize-Image $src $size $size (Join-Path $folder "ic_launcher.png")
        Resize-Image $src $size $size (Join-Path $folder "ic_launcher_round.png")
        Resize-Image $src $size $size (Join-Path $folder "ic_launcher_foreground.png")
    }
}

# 4. Generate iOS AppIcon 1024x1024
$userIosDir = Join-Path $PSScriptRoot "..\packages\user\ios\App\App\Assets.xcassets\AppIcon.appiconset"
if (Test-Path $userIosDir) {
    Resize-Image $userSrc 1024 1024 (Join-Path $userIosDir "AppIcon-512@2x.png")
}

$driverIosDir = Join-Path $PSScriptRoot "..\packages\driver\ios\App\App\Assets.xcassets\AppIcon.appiconset"
if (Test-Path $driverIosDir) {
    Resize-Image $driverSrc 1024 1024 (Join-Path $driverIosDir "AppIcon-512@2x.png")
}

# 5. Place web friendly icons in public/
$publicDir = Join-Path $PSScriptRoot "..\public"
Resize-Image $userSrc 192 192 (Join-Path $publicDir "app-icon-192.png")
Resize-Image $userSrc 512 512 (Join-Path $publicDir "app-icon-512.png")
Resize-Image $userSrc 128 128 (Join-Path $publicDir "app-icon-128.png")

$driverPublicDir = Join-Path $PSScriptRoot "..\public\Drivers"
Resize-Image $driverSrc 192 192 (Join-Path $driverPublicDir "app-icon-192.png")
Resize-Image $driverSrc 512 512 (Join-Path $driverPublicDir "app-icon-512.png")
Resize-Image $driverSrc 128 128 (Join-Path $driverPublicDir "app-icon-128.png")

$userSrc.Dispose()
if ($driverSrc -ne $userSrc) {
    $driverSrc.Dispose()
}
Write-Host "All notification and app icons successfully generated! (User from App icon.png, Driver from Drivers App icon.png)"
