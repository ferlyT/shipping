Add-Type -AssemblyName System.Drawing

function Draw-PackageIcon([int]$size) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Background rounded rectangle
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush (
        (New-Object System.Drawing.PointF 0, 0),
        (New-Object System.Drawing.PointF $size, $size),
        ([System.Drawing.Color]::FromArgb(255, 30, 41, 59)),   # #1e293b
        ([System.Drawing.Color]::FromArgb(255, 15, 23, 42))    # #0f172a
    )

    $radius = [float]($size * 0.21)
    $diam = $radius * 2.0
    $rect = New-Object System.Drawing.RectangleF 0, 0, $size, $size

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc($rect.X, $rect.Y, $diam, $diam, 180, 90)
    $path.AddArc($rect.Right - $diam, $rect.Y, $diam, $diam, 270, 90)
    $path.AddArc($rect.Right - $diam, $rect.Bottom - $diam, $diam, $diam, 0, 90)
    $path.AddArc($rect.X, $rect.Bottom - $diam, $diam, $diam, 90, 90)
    $path.CloseFigure()

    $g.FillPath($brush, $path)

    # Subtle inner border
    $bWidth = [float][Math]::Max(1.0, ($size * 0.012))
    $borderPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(50, 255, 255, 255)), $bWidth
    $g.DrawPath($borderPen, $path)

    # Scale factor from 24x24 to size
    # In Sidebar: container 32, icon 20 -> 62.5%
    $iconSize = $size * 0.625
    $scale = $iconSize / 24.0
    $offset = ($size - $iconSize) / 2.0

    function MX($x) { return [float]($offset + $x * $scale) }
    function MY($y) { return [float]($offset + $y * $scale) }

    $penWidth = [float][Math]::Max(1.2, (2.1 * $scale))
    $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), $penWidth
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

    # Outer package polygon
    $packPts = @(
        (New-Object System.Drawing.PointF (MX 12), (MY 2.27)),
        (New-Object System.Drawing.PointF (MX 20.71), (MY 7)),
        (New-Object System.Drawing.PointF (MX 20.71), (MY 16.5)),
        (New-Object System.Drawing.PointF (MX 12), (MY 21.73)),
        (New-Object System.Drawing.PointF (MX 3.29), (MY 16.5)),
        (New-Object System.Drawing.PointF (MX 3.29), (MY 7))
    )
    $packPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $packPath.AddPolygon($packPts)
    $g.DrawPath($pen, $packPath)

    # Vertical center crease
    $g.DrawLine($pen, (MX 12), (MY 12), (MX 12), (MY 21.73))

    # Flap V lines
    $g.DrawLine($pen, (MX 3.29), (MY 7), (MX 12), (MY 12))
    $g.DrawLine($pen, (MX 12), (MY 12), (MX 20.71), (MY 7))

    # Tape band across top flap
    $g.DrawLine($pen, (MX 7.5), (MY 4.27), (MX 16.5), (MY 9.42))

    $borderPen.Dispose()
    $pen.Dispose()
    $brush.Dispose()
    $path.Dispose()
    $packPath.Dispose()
    $g.Dispose()

    return $bmp
}

# Generate PNG bytes for each size
$sizes = @(16, 32, 48, 64, 128, 256)
$pngList = @()

foreach ($s in $sizes) {
    $bmp = Draw-PackageIcon $s
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bytes = $ms.ToArray()
    $ms.Dispose()
    $bmp.Dispose()
    $pngList += @{ Size = $s; Data = $bytes }
}

# Construct multi-size ICO binary
$count = $pngList.Count
$headerSize = 6 + ($count * 16)
$currentOffset = $headerSize

$icoStream = New-Object System.IO.MemoryStream
$writer = New-Object System.IO.BinaryWriter $icoStream

# ICONDIR
$writer.Write([uint16]0)       # Reserved
$writer.Write([uint16]1)       # Type 1 = ICO
$writer.Write([uint16]$count)   # Number of images

# Calculate offsets and write ICONDIRENTRY
foreach ($item in $pngList) {
    $w = if ($item.Size -ge 256) { [byte]0 } else { [byte]$item.Size }
    $h = if ($item.Size -ge 256) { [byte]0 } else { [byte]$item.Size }
    $writer.Write($w)          # Width
    $writer.Write($h)          # Height
    $writer.Write([byte]0)     # ColorCount
    $writer.Write([byte]0)     # Reserved
    $writer.Write([uint16]1)   # Color Planes
    $writer.Write([uint16]32)  # Bits per pixel
    $writer.Write([uint32]$item.Data.Length) # Size in bytes
    $writer.Write([uint32]$currentOffset)    # Offset
    $currentOffset += $item.Data.Length
}

# Write PNG data chunks
foreach ($item in $pngList) {
    $writer.Write($item.Data)
}

$icoBytes = $icoStream.ToArray()
$writer.Dispose()
$icoStream.Dispose()

# Save to public and dist
[System.IO.File]::WriteAllBytes('C:\shipping\frontend\public\favicon.ico', $icoBytes)
if (Test-Path 'C:\shipping\frontend\dist') {
    [System.IO.File]::WriteAllBytes('C:\shipping\frontend\dist\favicon.ico', $icoBytes)
}

Write-Host "Generated favicon.ico successfully! Size: $($icoBytes.Length) bytes ($count resolutions)"
