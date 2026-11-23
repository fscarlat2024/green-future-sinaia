# Creeaza un cont de proprietar si ii trimite emailul de pe rezervari@, cu parola in fisier atasat si ghidul proprietarului.
# Parola ramane si local, in cont-<nume>.txt (in afara git).
# Exemplu:  .\tools\cont-proprietar.ps1 -Email "nume@exemplu.ro"
param([Parameter(Mandatory)][string]$Email)
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root
$e = $Email.Trim().ToLower()
if ($e -notmatch '^[^@\s]+@[^@\s]+\.[a-z]{2,}$') { throw "Adresa nu pare corecta: $e" }
$w = "node_modules/wrangler/bin/wrangler.js"
$ex = $null
for ($i = 0; $i -lt 4 -and -not $ex; $i++) {
  $o = (node $w d1 execute green-future --remote --json --command "SELECT (SELECT COUNT(*) FROM admins WHERE email='$e') a, (SELECT COUNT(*) FROM guests WHERE email='$e') g" 2>&1 | Out-String)
  try { $ex = ($o | ConvertFrom-Json)[0].results[0] } catch { Start-Sleep 4 }
}
if (-not $ex) { throw "Baza de date nu a raspuns." }
if ($ex.a -ne 0) { throw "Exista deja un cont de proprietar pe $e." }
$f = "cont-" + ($e.Split('@')[0] -replace '[^a-z0-9]', '') + ".txt"
"Cont proprietar Green Future (creat $(Get-Date -Format 'dd.MM.yyyy HH:mm'))" | Set-Content $f -Encoding utf8
node tools/creeaza-cont.mjs $e owner --remote 2>&1 | Where-Object { $_ -match 'Cont|Parola' } | Add-Content $f -Encoding utf8
"Intrare pe web: https://greenfuturesinaia.com/admin" | Add-Content $f -Encoding utf8
$pw = ((Get-Content $f | Where-Object { $_ -like 'Parola*' }) -split ':', 2)[1].Trim()
$r = Invoke-RestMethod -Method POST -Uri "https://greenfuturesinaia.com/api/guest/login" -ContentType "application/json" -Body (@{ email = $e; password = $pw } | ConvertTo-Json)
if (-not $r.admin) { throw "Contul nu intra ca proprietar." }
$tmp = Join-Path $env:TEMP ("gf-cont-" + [guid]::NewGuid())
New-Item -ItemType Directory $tmp | Out-Null
try {
  "Cont proprietar Green Future Sinaia`r`n`r`nEmail: $e`r`nParola: $pw`r`n`r`nIntrare: din aplicatia Green Future (ecranul de cont) sau pe calculator la https://greenfuturesinaia.com/admin" | Set-Content "$tmp\cont-proprietar.txt" -Encoding ascii
  $guest = if ($ex.g -ne 0) { "`r`nPe această adresă aveți și un cont de oaspete: cu parola din fișier intrați ca proprietar, iar cu parola veche, ca oaspete.`r`n" } else { "" }
  $body = @"
Bună ziua,

V-am creat un cont de proprietar în aplicația Green Future Sinaia, ca să vă puteți adăuga apartamentul.

Din motive de securitate, nu am scris parola în acest email: datele de intrare (emailul și parola) sunt în fișierul atașat, cont-proprietar.txt. Tot atașat găsiți și ghidul proprietarului, cu pașii pentru adăugarea apartamentului (în română și engleză).

Vă conectați din aplicația Green Future, pe ecranul de cont, cu emailul și parola din fișier. Merge și de pe calculator: https://greenfuturesinaia.com/admin
$guest
Pentru orice întrebare, ne puteți răspunde la acest email.

Cu stimă,
Florin Scarlat
Green Future Sinaia
"@
  [IO.File]::WriteAllText("$tmp\corp.txt", $body, (New-Object Text.UTF8Encoding $false))
  & "$PSScriptRoot\trimite-email.ps1" -Catre $e -Subiect "Contul de proprietar – Green Future Sinaia" -FisierText "$tmp\corp.txt" -Atasament "$tmp\cont-proprietar.txt", "$root\ghid\Ghid-proprietar-Green-Future.pdf"
} finally { Remove-Item $tmp -Recurse -Force }
"cont creat ($f), oaspete existent: $($ex.g -ne 0)"
