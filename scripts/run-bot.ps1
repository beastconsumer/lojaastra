$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$node = (Get-Command node).Source

$logsDir = Join-Path $root "logs"
New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

$out = Join-Path $logsDir "bot.out.log"
$err = Join-Path $logsDir "bot.err.log"
$pidFile = Join-Path $logsDir "bot.pid"

function Get-BotProcs {
  Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object {
    $_.CommandLine -and $_.CommandLine -match "botdc.*src[\\\\/]+index\\.js"
  }
}

# Ensure only one bot is running.
$existing = @(Get-BotProcs)
if ($existing.Count -gt 0) {
  foreach ($p in $existing) {
    try { Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop } catch {}
  }
  Start-Sleep -Milliseconds 300
}

$proc = Start-Process `
  -FilePath $node `
  -ArgumentList @("src/index.js") `
  -WorkingDirectory $root `
  -PassThru `
  -RedirectStandardOutput $out `
  -RedirectStandardError $err

Set-Content -Path $pidFile -Value $proc.Id -Encoding ascii
"Bot iniciado. PID=$($proc.Id)"
"Logs: $out"
"Erros: $err"
