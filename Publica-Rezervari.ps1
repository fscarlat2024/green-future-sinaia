# Publica rezervarile pe greenfuturesinaia.com. Rezervarile raman oprite pana le activezi din /admin.
# Poate fi rulat de mai multe ori: nu recreeaza baza si nu schimba parola existenta.
param([string]$AdminEmail = "fscarlat@gmail.com")

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$wrangler = "node_modules/wrangler/bin/wrangler.js"
$dbName = "green-future"

function Get-DbId {
    # imediat dupa reinnoirea autentificarii Cloudflare poate refuza prima cerere
    for ($i = 1; $i -le 4; $i++) {
        try {
            $list = (node $wrangler d1 list --json | Out-String) | ConvertFrom-Json
            $db = @($list) | Where-Object { $_.name -eq $dbName } | Select-Object -First 1
            if ($db) { return $db.uuid }
            return $null
        } catch {
            if ($i -eq 4) { throw "Cloudflare refuza autentificarea. Ruleaza: node $wrangler login" }
            Write-Host "    Reincerc in 15 secunde..."
            Start-Sleep -Seconds 15
        }
    }
}

Write-Host "1/6 Baza de date" -ForegroundColor Cyan
$id = Get-DbId
if (-not $id) {
    node $wrangler d1 create $dbName --location=eeur | Out-Null
    $id = Get-DbId
}
if (-not $id) { throw "Baza de date nu a putut fi creata." }
Write-Host "    $id"

Write-Host "2/6 Configurare" -ForegroundColor Cyan
$configPath = Join-Path $PSScriptRoot "wrangler.jsonc"
$config = [IO.File]::ReadAllText($configPath)
[IO.File]::WriteAllText($configPath, $config.Replace('"PENDING"', '"' + $id + '"'))

Write-Host "3/6 Structura bazei de date" -ForegroundColor Cyan
node $wrangler d1 migrations apply $dbName --remote

Write-Host "4/6 Construire si publicare" -ForegroundColor Cyan
npx @11ty/eleventy
node $wrangler deploy

Write-Host "5/6 Cont administrator" -ForegroundColor Cyan
if (Test-Path "cont-admin.txt") {
    Write-Host "    Exista deja, parola nu se schimba."
} else {
    node tools/creeaza-cont.mjs $AdminEmail admin --remote | Out-File -Encoding utf8 "cont-admin.txt"
    Write-Host "    Parola este in cont-admin.txt"
}

Write-Host "6/6 Salvare in GitHub" -ForegroundColor Cyan
git add -A
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
    git commit -m "Rezervari directe: calendar, cautare, panou proprietari, sincronizare iCal" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
    git push
}

Write-Host ""
Write-Host "Verificare" -ForegroundColor Cyan
Start-Sleep -Seconds 5
$api = Invoke-WebRequest -UseBasicParsing "https://greenfuturesinaia.com/api/properties"
Write-Host "    API: $($api.StatusCode) $($api.Content)"
$admin = Invoke-WebRequest -UseBasicParsing "https://greenfuturesinaia.com/admin/"
Write-Host "    Panou: $($admin.StatusCode)"
Write-Host "Gata. Panou: https://greenfuturesinaia.com/admin/" -ForegroundColor Green
