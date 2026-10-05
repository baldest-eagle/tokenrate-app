<#
.SYNOPSIS
    One-click installer for TokenRate - AI Model Directory.
.DESCRIPTION
    Installs npm dependencies, builds Next.js production bundle,
    compiles the native Windows TokenRate.exe launcher with embedded icon,
    and creates an "AI Model Directory" shortcut on your Desktop.
#>

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   TokenRate - AI Model Directory Installer" -ForegroundColor Magenta
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Node.js
Write-Host "[1/5] Checking Node.js environment..." -ForegroundColor Yellow
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js is not installed or not in PATH. Please install Node.js (v18+) and try again."
}
$nodeVersion = node -v
Write-Host "      Found Node.js $nodeVersion" -ForegroundColor Green

# 2. Install dependencies
Write-Host "[2/5] Installing npm dependencies..." -ForegroundColor Yellow
Set-Location $ScriptDir
cmd.exe /c "npm.cmd install"
if ($LASTEXITCODE -ne 0) {
    Write-Error "npm install failed."
}
Write-Host "      Dependencies installed successfully." -ForegroundColor Green

# 3. Build Next.js
Write-Host "[3/5] Building Next.js production bundle..." -ForegroundColor Yellow
cmd.exe /c "npm.cmd run build"
if ($LASTEXITCODE -ne 0) {
    Write-Error "npm run build failed."
}
Write-Host "      Next.js production build ready." -ForegroundColor Green

# 4. Compile native TokenRate.exe
Write-Host "[4/5] Compiling native Windows launcher (TokenRate.exe)..." -ForegroundColor Yellow
$cscPath = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $cscPath)) {
    $cscPath = (Get-ChildItem -Path "C:\Windows\Microsoft.NET\Framework64\*\csc.exe" -ErrorAction SilentlyContinue | Select-Object -Last 1).FullName
}

if ($cscPath -and (Test-Path $cscPath)) {
    & $cscPath /target:winexe /out:"$ScriptDir\TokenRate.exe" /win32icon:"$ScriptDir\app.ico" /r:System.dll,System.Drawing.dll,System.Windows.Forms.dll "$ScriptDir\Launcher.cs"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "      TokenRate.exe compiled successfully with custom icon." -ForegroundColor Green
    } else {
        Write-Warning "      Could not compile TokenRate.exe via csc.exe. Precompiled executable will be used if present."
    }
} else {
    Write-Warning "      csc.exe not found. Skipping compilation."
}

# 5. Create Desktop shortcut
Write-Host "[5/5] Creating Desktop shortcut..." -ForegroundColor Yellow
$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktopPath "AI Model Directory.lnk"
$targetExe = Join-Path $ScriptDir "TokenRate.exe"

$wshShell = New-Object -ComObject WScript.Shell
$shortcut = $wshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $targetExe
$shortcut.WorkingDirectory = $ScriptDir
$shortcut.IconLocation = "$targetExe,0"
$shortcut.Description = "AI Model Directory (TokenRate)"
$shortcut.Save()

Write-Host "      Shortcut created at: $shortcutPath" -ForegroundColor Green
Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Installation Complete! 🎉" -ForegroundColor Green
Write-Host "   Launch the app via your Desktop shortcut 'AI Model Directory'" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
