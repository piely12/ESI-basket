$ErrorActionPreference = 'Stop'

$baseUrl = $env:AUTH_TEST_BASE_URL
if (-not $baseUrl) { $baseUrl = 'http://localhost:3000' }
$baseUrl = $baseUrl.TrimEnd('/')
$origin = $baseUrl

foreach ($name in @('AUTH_TEST_EMAIL', 'AUTH_TEST_BAD_PASSWORD', 'AUTH_TEST_UNKNOWN_EMAIL')) {
  if (-not [Environment]::GetEnvironmentVariable($name)) { throw "Définis la variable d’environnement $name avec un compte de test." }
}

function Invoke-AuthCurl([string]$Path, [hashtable]$Body, [string]$OriginHeader, [string]$CookieJar = '') {
  $bodyFile = [IO.Path]::GetTempFileName()
  $responseFile = [IO.Path]::GetTempFileName()
  $headersFile = [IO.Path]::GetTempFileName()
  try {
    [IO.File]::WriteAllText($bodyFile, ($Body | ConvertTo-Json -Compress))
    $curlArgs = @('-sS', '-o', $responseFile, '-D', $headersFile, '-w', '%{http_code}',
      '-H', 'Content-Type: application/json')
    if ($OriginHeader) { $curlArgs += @('-H', "Origin: $OriginHeader") }
    if ($CookieJar) { $curlArgs += @('-b', $CookieJar, '-c', $CookieJar) }
    $curlArgs += @('--data-binary', "@$bodyFile", "$baseUrl$Path")
    $statusText = & curl.exe @curlArgs
    $status = [int]($statusText | Select-Object -Last 1)
    $json = [IO.File]::ReadAllText($responseFile) | ConvertFrom-Json -ErrorAction SilentlyContinue
    $headers = [IO.File]::ReadAllText($headersFile)
    return @{ Status = $status; Body = $json; Headers = $headers }
  } finally {
    Remove-Item -LiteralPath $bodyFile, $responseFile, $headersFile -Force -ErrorAction SilentlyContinue
  }
}

function Report([string]$Name, [bool]$Passed, [string]$Evidence) {
  $result = if ($Passed) { 'PASS' } else { 'FAIL' }
  Write-Output "$result | $Name | $Evidence"
  if (-not $Passed) { $script:failed = $true }
}

$script:failed = $false
$knownEmail = $env:AUTH_TEST_EMAIL.Trim().ToLowerInvariant()
$unknownEmail = $env:AUTH_TEST_UNKNOWN_EMAIL.Trim().ToLowerInvariant()
$badPassword = $env:AUTH_TEST_BAD_PASSWORD

$wrongPassword = Invoke-AuthCurl '/api/auth/login' @{ email = $knownEmail; password = $badPassword } $origin
Report 'Mot de passe incorrect générique' ($wrongPassword.Status -eq 401 -and $wrongPassword.Body.error -eq 'Identifiants incorrects.') "HTTP $($wrongPassword.Status), message générique"

$unknownWatch = [Diagnostics.Stopwatch]::StartNew()
$unknown = Invoke-AuthCurl '/api/auth/login' @{ email = $unknownEmail; password = $badPassword } $origin
$unknownWatch.Stop()
Report 'E-mail inconnu, anti-énumération' ($unknown.Status -eq 401 -and $unknown.Body.error -eq 'Identifiants incorrects.') "HTTP $($unknown.Status), message générique"
$knownWatch = [Diagnostics.Stopwatch]::StartNew()
$known = Invoke-AuthCurl '/api/auth/login' @{ email = $knownEmail; password = $badPassword } $origin
$knownWatch.Stop()
$timeDifference = [Math]::Abs($unknownWatch.ElapsedMilliseconds - $knownWatch.ElapsedMilliseconds)
Report 'Temps de réponse comparable' ($timeDifference -le 1500) "différence mesurée $timeDifference ms (seuil script: 1500 ms)"

$badOrigin = Invoke-AuthCurl '/api/auth/login' @{ email = $knownEmail; password = $badPassword } 'https://attacker.invalid'
Report 'Origin inattendu refusé' ($badOrigin.Status -eq 403) "HTTP $($badOrigin.Status)"

$bodyFile = [IO.Path]::GetTempFileName()
$responseFile = [IO.Path]::GetTempFileName()
try {
  [IO.File]::WriteAllText($bodyFile, (@{ email = $knownEmail; password = $badPassword } | ConvertTo-Json -Compress))
  $statusText = & curl.exe -sS -o $responseFile -w '%{http_code}' -H 'Content-Type: application/json' --data-binary "@$bodyFile" "$baseUrl/api/auth/login"
  $status = [int]($statusText | Select-Object -Last 1)
  Report 'Origin et Sec-Fetch-Site absents refusés' ($status -eq 403) "HTTP $status"
} finally {
  Remove-Item -LiteralPath $bodyFile, $responseFile -Force -ErrorAction SilentlyContinue
}

$rateLimited = $false
$requests = 0
for ($i = 0; $i -lt 12; $i++) {
  $attempt = Invoke-AuthCurl '/api/auth/login' @{ email = $knownEmail; password = $badPassword } $origin
  $requests++
  if ($attempt.Status -eq 429 -and $attempt.Headers -match '(?im)^Retry-After:\s*\d+') { $rateLimited = $true; break }
}
Report 'Brute force limité avec Retry-After' $rateLimited "429 après $requests requêtes; en-tête Retry-After présent"

if ($script:failed) { exit 1 }
