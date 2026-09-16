# Script repack dan signing APK M-Shipping
$ErrorActionPreference = "Stop"

$javaExe = "C:\Program Files\JetBrains\PyCharm Community Edition 2024.3.1.1\jbr\bin\java.exe"
$uberSigner = "C:\shipping\uber-apk-signer.jar"
$keystore = "C:\shipping\mobile\keystore\release.keystore"
$targetApk = "C:\shipping\mshipping.apk"

# 1. Cari file bundle bytecode hermes terbaru
$bundleFile = Get-ChildItem -Path "C:\shipping\mobile\dist\_expo\static\js\android\entry-*.hbc" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $bundleFile) {
    throw "Bundle hermes tidak ditemukan di mobile/dist/_expo/static/js/android!"
}
Write-Host "Bundle ditemukan: $($bundleFile.FullName) ($($bundleFile.Length) bytes)"

# 2. Buka ZIP APK dan replace assets/index.android.bundle
[void][Reflection.Assembly]::LoadWithPartialName("System.IO.Compression")
[void][Reflection.Assembly]::LoadWithPartialName("System.IO.Compression.FileSystem")
$zip = [System.IO.Compression.ZipFile]::Open($targetApk, [System.IO.Compression.ZipArchiveMode]::Update)
try {
    $entry = $zip.GetEntry("assets/index.android.bundle")
    if ($entry) {
        $entry.Delete()
        Write-Host "Lama assets/index.android.bundle dihapus."
    }
    
    # Tambahkan bundle baru
    $newEntry = $zip.CreateEntry("assets/index.android.bundle", [System.IO.Compression.CompressionLevel]::Optimal)
    $stream = $newEntry.Open()
    $fileBytes = [System.IO.File]::ReadAllBytes($bundleFile.FullName)
    $stream.Write($fileBytes, 0, $fileBytes.Length)
    $stream.Close()
    Write-Host "assets/index.android.bundle baru berhasil diinjeksi."
} finally {
    $zip.Dispose()
}

# 3. Sign dengan uber-apk-signer
Write-Host "Menandatangani APK dengan uber-apk-signer..."
& $javaExe -jar $uberSigner `
    --apks $targetApk `
    --ks $keystore `
    --ksAlias mshipping `
    --ksPass mshipping2026 `
    --ksKeyPass mshipping2026 `
    --allowResign `
    --overwrite

if ($LASTEXITCODE -ne 0) {
    throw "Gagal menandatangani APK!"
}

# 4. Sinkronkan ke 3 lokasi distribusi lainnya
$destinations = @(
    "C:\shipping\frontend\dist\mshipping.apk",
    "C:\shipping\frontend\public\mshipping.apk",
    "C:\shipping\backend\public\uploads\mshipping.apk"
)

foreach ($dest in $destinations) {
    $destDir = Split-Path -Path $dest -Parent
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    Copy-Item -Path $targetApk -Destination $dest -Force
    Write-Host "Disalin ke: $dest ($((Get-Item $dest).Length) bytes)"
}

Write-Host "Repack dan signing selesai 100%!"
