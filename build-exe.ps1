$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$cscPath = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $cscPath)) {
    $cscPath = (Get-ChildItem -Path "C:\Windows\Microsoft.NET\Framework64\*\csc.exe" -ErrorAction SilentlyContinue | Select-Object -Last 1).FullName
}
& $cscPath /target:winexe /out:"$ScriptDir\TokenRate.exe" /win32icon:"$ScriptDir\app.ico" /r:System.dll,System.Drawing.dll,System.Windows.Forms.dll "$ScriptDir\Launcher.cs"
if ($LASTEXITCODE -eq 0) {
    Write-Host "TokenRate.exe compiled successfully with custom icon." -ForegroundColor Green
} else {
    Write-Error "Compilation failed."
}
