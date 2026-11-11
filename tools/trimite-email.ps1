# Trimite un email de pe rezervari@greenfuturesinaia.com prin SMTP Brevo.
# Cheia SMTP se citeste din brevo-key.txt (in afara git). Fara cheia in comanda.
# Exemplu:
#   .\tools\trimite-email.ps1 -Catre "x@y.ro" -Subiect "..." -FisierText corp.txt -Atasament cont.txt
param(
  [Parameter(Mandatory)][string]$Catre,
  [Parameter(Mandatory)][string]$Subiect,
  [Parameter(Mandatory)][string]$FisierText,
  [string[]]$Atasament = @(),
  [string]$Bcc = "fscarlat@gmail.com"
)
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$cheie = (Get-Content (Join-Path $root "brevo-key.txt") -Raw).Trim()
$login = "c1c5aa001@smtp-brevo.com"

$msg = New-Object System.Net.Mail.MailMessage
$msg.From = New-Object System.Net.Mail.MailAddress("rezervari@greenfuturesinaia.com", "Green Future Sinaia")
$msg.To.Add($Catre)
if ($Bcc) { $msg.Bcc.Add($Bcc) }
$msg.ReplyToList.Add("rezervari@greenfuturesinaia.com")
$msg.Subject = $Subiect
$msg.SubjectEncoding = [Text.Encoding]::UTF8
$msg.Body = [IO.File]::ReadAllText((Resolve-Path $FisierText), [Text.Encoding]::UTF8)
$msg.BodyEncoding = [Text.Encoding]::UTF8
foreach ($a in $Atasament) { $msg.Attachments.Add((New-Object System.Net.Mail.Attachment((Resolve-Path $a).Path))) }

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$smtp = New-Object System.Net.Mail.SmtpClient("smtp-relay.brevo.com", 587)
$smtp.EnableSsl = $true
$smtp.Credentials = New-Object System.Net.NetworkCredential($login, $cheie)
try { $smtp.Send($msg); "trimis catre $Catre (bcc $Bcc)" }
finally { $msg.Dispose(); $smtp.Dispose() }
