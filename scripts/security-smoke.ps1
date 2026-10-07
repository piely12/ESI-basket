param(
  [string]$BaseUrl = 'http://localhost:3000'
)

$ErrorActionPreference = 'Stop'
$failures = 0

function Check-Status([string]$Path, [int[]]$AllowedStatus) {
  $response = & curl.exe -sS -o NUL -D - "$BaseUrl$Path"
  $statusLine = ($response | Select-String '^HTTP/').Line | Select-Object -Last 1
  $status = 0
  if ($statusLine -match '^HTTP/\S+\s+(\d+)') { $status = [int]$Matches[1] }
  $ok = $AllowedStatus -contains $status
  Write-Output "$(if ($ok) {'PASS'} else {'FAIL'}) GET $Path => HTTP $status"
  if (-not $ok) { $script:failures++ }
}

function Check-Header([string]$Path, [string]$Header, [string]$Pattern) {
  $response = & curl.exe -sS -o NUL -D - "$BaseUrl$Path"
  $line = ($response | Select-String "(?i)^${Header}:").Line | Select-Object -Last 1
  $ok = $line -match $Pattern
  Write-Output "$(if ($ok) {'PASS'} else {'FAIL'}) $Header on $Path"
  if (-not $ok) { $script:failures++ }
}

foreach ($path in @('/admin', '/coach', '/stats', '/actus', '/joueurs')) {
  Check-Status $path @(302, 307)
}
Check-Status '/test-connexion' @(404)
Check-Header '/login' 'content-security-policy' "default-src 'self'.*script-src.*nonce-.*object-src 'none'.*frame-ancestors 'none'"
Check-Header '/login' 'x-content-type-options' '^nosniff$'
Check-Header '/login' 'x-frame-options' '^DENY$'

if ($failures -gt 0) { exit 1 }
Write-Output 'Security smoke checks completed. This does not verify database RLS or real-account authorization.'
