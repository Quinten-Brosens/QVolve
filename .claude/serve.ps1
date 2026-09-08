<#
  Lokale dev-server voor Qvolve.

  Nodig omdat Babel de .jsx-bestanden via fetch ophaalt: over file:// blokkeert
  dat en toont de app "Script error. Regel 0". Open de app dus NOOIT door
  qvolve.html te dubbelklikken.

  Starten:
    powershell -NoProfile -ExecutionPolicy Bypass -File .claude/serve.ps1
  Dan openen:
    http://localhost:8765/qvolve.html

  De serverless proxies (/api/gemini, /api/off-search) bestaan hier niet; die
  geven 501 met een hint. Gebruik `vercel dev` als je AI of OFF-tekstzoeken
  lokaal wil testen. Barcode scannen werkt wel (rechtstreekse v2-API met CORS).
#>
[CmdletBinding()]
param(
  [int]$Port = 8765,
  [string]$Root = ''
)

$ErrorActionPreference = 'Stop'

# $PSScriptRoot is niet betrouwbaar gevuld in een param-default op PS 5.1,
# dus bepalen we de projectmap hier: de map boven .claude/.
if ([string]::IsNullOrWhiteSpace($Root)) {
  $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
  $Root = Split-Path -Parent $scriptDir
}
$Root = (Resolve-Path -LiteralPath $Root).Path

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8'
  '.jsx'  = 'text/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.svg'  = 'image/svg+xml'
  '.ico'  = 'image/x-icon'
  '.webmanifest' = 'application/manifest+json'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
try {
  $listener.Start()
} catch {
  Write-Host "Kan niet starten op poort $Port. Draait er al een server? ($($_.Exception.Message))"
  exit 1
}

Write-Host ""
Write-Host "  Qvolve dev-server"
Write-Host "  -> http://localhost:$Port/qvolve.html"
Write-Host "  root: $Root"
Write-Host "  Ctrl+C stopt de server."
Write-Host ""

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $res = $ctx.Response
    $rel = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
    if ([string]::IsNullOrWhiteSpace($rel)) { $rel = 'qvolve.html' }

    try {
      # Serverless functies bestaan niet op deze server.
      if ($rel -like 'api/*') {
        $body = [System.Text.Encoding]::UTF8.GetBytes('{"error":"Deze proxy draait niet op de dev-server. Gebruik `vercel dev` voor /api/*."}')
        $res.StatusCode = 501
        $res.ContentType = 'application/json; charset=utf-8'
        $res.OutputStream.Write($body, 0, $body.Length)
        Write-Host ("  501  /{0}" -f $rel)
        $res.Close()
        continue
      }

      $full = Join-Path $Root ($rel -replace '/', '\')
      $resolved = $null
      try { $resolved = (Resolve-Path -LiteralPath $full -ErrorAction Stop).Path } catch { }

      # Buiten de projectmap serveren we niets.
      if (-not $resolved -or -not $resolved.StartsWith($Root, [System.StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $resolved -PathType Leaf)) {
        $body = [System.Text.Encoding]::UTF8.GetBytes("404 - niet gevonden: /$rel")
        $res.StatusCode = 404
        $res.ContentType = 'text/plain; charset=utf-8'
        $res.OutputStream.Write($body, 0, $body.Length)
        Write-Host ("  404  /{0}" -f $rel)
        $res.Close()
        continue
      }

      $ext = [System.IO.Path]::GetExtension($resolved).ToLowerInvariant()
      $bytes = [System.IO.File]::ReadAllBytes($resolved)
      $res.StatusCode = 200
      $res.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
      # Nooit cachen: anders zie je je eigen wijzigingen niet.
      $res.Headers.Add('Cache-Control', 'no-store, max-age=0')
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
      Write-Host ("  200  /{0}" -f $rel)
    } catch {
      $res.StatusCode = 500
      Write-Host ("  500  /{0}  {1}" -f $rel, $_.Exception.Message)
    } finally {
      try { $res.Close() } catch { }
    }
  }
} finally {
  $listener.Stop()
  $listener.Close()
}
