Add-Type -AssemblyName System.Drawing

$templatePath = Join-Path $PSScriptRoot "..\src\assets\trip_ticket_template.png"
$jsonPath = Join-Path $PSScriptRoot "..\src\assets\trip_ticket_fields.json"
$outputPath = Join-Path $PSScriptRoot "..\src\assets\sample_filled_ticket.png"

$json = Get-Content $jsonPath | ConvertFrom-Json

$srcBmp = [System.Drawing.Bitmap]::FromFile($templatePath)
$destBmp = New-Object System.Drawing.Bitmap($json.canvas.width, $json.canvas.height)
$g = [System.Drawing.Graphics]::FromImage($destBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# 1. Draw template background
$g.DrawImage($srcBmp, 0, 0, $json.canvas.width, $json.canvas.height)

# 2. Draw Trip ID opposite TRIP DETAILS
$tripIdFont = New-Object System.Drawing.Font('Segoe UI', 15, [System.Drawing.FontStyle]::Bold)
$labelBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($json.label_color))
$g.DrawString('#TRP-8504', $tripIdFont, $labelBrush, 760, 56)

# 3. Text Brush & Fonts
$textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($json.text_color))

# From Location
$fromFont = New-Object System.Drawing.Font('Segoe UI', 24, [System.Drawing.FontStyle]::Bold)
$fromText = "177, Kottakkal, Koduvally, Keralam"
$g.DrawString($fromText, $fromFont, $textBrush, $json.fields.from_location.x, $json.fields.from_location.y)

# To Location
$toText = "Kozhikode Beach, Calicut"
$g.DrawString($toText, $fromFont, $textBrush, $json.fields.to_location.x, $json.fields.to_location.y)

# Driver Name
$driverFont = New-Object System.Drawing.Font('Segoe UI', 26, [System.Drawing.FontStyle]::Bold)
$driverText = "Ravi Kumar"
$g.DrawString($driverText, $driverFont, $textBrush, $json.fields.driver_name.x, $json.fields.driver_name.y)

# Total Fare
$fareFont = New-Object System.Drawing.Font('Segoe UI', 30, [System.Drawing.FontStyle]::Bold)
$fareText = "₹750"
$g.DrawString($fareText, $fareFont, $textBrush, $json.fields.total_fare.x, $json.fields.total_fare.y)

# OTP Digits
$otpFont = New-Object System.Drawing.Font('Segoe UI', 46, [System.Drawing.FontStyle]::Bold)
$otpDigits = "4821"

for ($i = 0; $i -lt $json.fields.otp_text.boxes.Count; $i++) {
    $box = $json.fields.otp_text.boxes[$i]
    $digit = $otpDigits[$i].ToString()
    
    # Measure string to center perfectly
    $size = $g.MeasureString($digit, $otpFont)
    $dx = $box.x + ($box.width - $size.Width) / 2
    $dy = $box.y + ($box.height - $size.Height) / 2
    $g.DrawString($digit, $otpFont, $textBrush, $dx, $dy)
}

$destBmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$srcBmp.Dispose()
$destBmp.Dispose()

Write-Host "Sample filled ticket saved to $outputPath"
