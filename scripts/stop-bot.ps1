$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$logsDir = Join-Path $root "logs"
$pidFile = Join-Path $logsDir "bot.pid"

function Stop-BotPid($botPid) {
  if (-not $botPid) { return $false }
  try {
    Stop-Process -Id $botPid -Force -ErrorAction Stop
    "Bot parado. PID=$botPid"
    if (Test-Path $pidFile) { Remove-Item -Force $pidFile -ErrorAction SilentlyContinue }
    return $true
  } catch {
    return $false
  }
}

if (Test-Path $pidFile) {
  $botPid = (Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
  if (Stop-BotPid $botPid) { exit 0 }
}

$procs = Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object {
  $_.CommandLine -and $_.CommandLine -match "botdc.*src[\\\\/]+index\\.js"
}

if (-not $procs) {
  "Nenhum bot rodando."
  exit 0
}

foreach ($p in $procs) {
  try { Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop; \"Bot parado. PID=$($p.ProcessId)\" } catch {}
}
