Add-Type -AssemblyName System.Drawing

$width = 960
$height = 1270

$bmp = New-Object System.Drawing.Bitmap($width, $height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# 1. Background (Crisp minimal luxury off-white #F8FAFC)
$bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#F8FAFC'))
$g.FillRectangle($bgBrush, 0, 0, $width, $height)

# 2. Main Ticket Card (#FFFFFF with subtle border #E2E8F0)
$cardBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$cardPen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml('#E2E8F0'), 3)
$g.FillRectangle($cardBrush, 30, 30, 900, 1210)
$g.DrawRectangle($cardPen, 30, 30, 900, 1210)

# 3. Ticket Header Banner (Dark Obsidian #0F172A)
$hdrBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#0F172A'))
$g.FillRectangle($hdrBrush, 30, 30, 900, 120)

# Header Title & Subtitle
$titleFont = New-Object System.Drawing.Font('Segoe UI', 24, [System.Drawing.FontStyle]::Bold)
$titleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#FFC70A'))
$g.DrawString('RIDINGO', $titleFont, $titleBrush, 60, 52)

$subFont = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
$subBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#94A3B8'))
$g.DrawString('VERIFIED CHAUFFEUR PASS', $subFont, $subBrush, 62, 98)

# Right badge: Trip pass tag
$tagBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 255, 255, 255))
$tagPen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml('#FFC70A'), 1.5)
$g.FillRectangle($tagBrush, 720, 62, 180, 48)
$g.DrawRectangle($tagPen, 720, 62, 180, 48)
$passFont = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
$passBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$g.DrawString('OFFICIAL PASS', $passFont, $passBrush, 746, 76)

# 4. Labels according to trip_ticket_fields.json specifications
$lblFont = New-Object System.Drawing.Font('Segoe UI', 13, [System.Drawing.FontStyle]::Bold)
$lblBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#8B8A85'))

# Route Labels
$g.DrawString('PICKUP LOCATION (FROM)', $lblFont, $lblBrush, 140, 180)
$g.DrawString('DROP DESTINATION (TO)', $lblFont, $lblBrush, 140, 392)

# Route Icons: Green circle for pickup, Red square for drop
$greenBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#22C55E'))
$g.FillEllipse($greenBrush, 70, 224, 32, 32)

$routePen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml('#CBD5E1'), 3)
$routePen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash
$g.DrawLine($routePen, 86, 266, 86, 426)

$redBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#EF4444'))
$g.FillRectangle($redBrush, 72, 436, 28, 28)

# Divider Line
$divPen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml('#E2E8F0'), 2)
$divPen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash
$g.DrawLine($divPen, 60, 560, 900, 560)

# Chauffeur & Fare Labels
$g.DrawString('ASSIGNED CHAUFFEUR', $lblFont, $lblBrush, 60, 606)
$g.DrawString('TOTAL FARE', $lblFont, $lblBrush, 560, 606)

# Divider Line
$g.DrawLine($divPen, 60, 800, 900, 800)

# OTP Header & Instruction
$otpLblFont = New-Object System.Drawing.Font('Segoe UI', 15, [System.Drawing.FontStyle]::Bold)
$g.DrawString('TRIP PICKUP OTP', $otpLblFont, $lblBrush, 60, 840)

$otpSubFont = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Regular)
$subMutedBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#64748B'))
$g.DrawString('Share this 4-digit verification code with your chauffeur upon arrival', $otpSubFont, $subMutedBrush, 60, 876)

# 4 Digit Boxes matching trip_ticket_fields.json coordinates:
# x: 60, 280, 500, 720; y: 990; width: 180, height: 150
$boxBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#F8FAFC'))
$boxPen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml('#CBD5E1'), 2.5)

$boxes = @(60, 280, 500, 720)
foreach ($bx in $boxes) {
    $g.FillRectangle($boxBrush, $bx, 990, 180, 150)
    $g.DrawRectangle($boxPen, $bx, 990, 180, 150)
}

# Footer security & tracking band
$footFont = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
$g.DrawString('🛡️ VERIFIED & TRACKED RIDE · RIDINGO CHAUFFEUR SERVICES', $footFont, $lblBrush, 60, 1190)

# Save to src/assets and public/assets
$dest1 = Join-Path $PSScriptRoot "..\src\assets\trip_ticket_template.png"
$dest2 = Join-Path $PSScriptRoot "..\public\assets\trip_ticket_template.png"

$parent1 = Split-Path -Parent $dest1
if (-not (Test-Path $parent1)) { New-Item -ItemType Directory -Path $parent1 -Force | Out-Null }
$parent2 = Split-Path -Parent $dest2
if (-not (Test-Path $parent2)) { New-Item -ItemType Directory -Path $parent2 -Force | Out-Null }

$bmp.Save($dest1, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Save($dest2, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bmp.Dispose()

Write-Host "Successfully generated trip_ticket_template.png (960x1270) at $dest1 and $dest2"
