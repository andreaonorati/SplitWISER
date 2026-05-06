<#
.SYNOPSIS
    Sposta il progetto SplitWISER fuori da OneDrive in una cartella locale,
    escludendo node_modules, build artifacts e shortcut .lnk che causano
    falsi positivi DLP / sync conflicts.

.DESCRIPTION
    - Mette in pausa la sincronizzazione di OneDrive (manuale, vedi nota)
    - Copia il contenuto in $Destination con robocopy (mirror, escludendo le dir/file pesanti)
    - NON cancella la cartella sorgente: lo farai tu manualmente dopo aver verificato
    - Reinstalla node_modules nella nuova posizione

.PARAMETER Destination
    Cartella di destinazione. Default: C:\src\SplitWISER

.EXAMPLE
    .\move-out-of-onedrive.ps1
    .\move-out-of-onedrive.ps1 -Destination D:\dev\SplitWISER -RunInstall

.NOTES
    Prima di lanciarlo: chiudi VS Code / dev server / processi node su questa cartella.
#>

[CmdletBinding()]
param(
    [string]$Destination = 'C:\src\SplitWISER',
    [switch]$RunInstall
)

$ErrorActionPreference = 'Stop'

# Source = cartella in cui si trova questo script (../ rispetto a /scripts)
$Source = Split-Path -Parent $PSScriptRoot
Write-Host "Source:      $Source" -ForegroundColor Cyan
Write-Host "Destination: $Destination" -ForegroundColor Cyan

if (-not (Test-Path $Source)) {
    throw "Source path non trovato: $Source"
}

if (Test-Path $Destination) {
    $answer = Read-Host "La destinazione '$Destination' esiste gia'. Continuare con merge/overwrite? [y/N]"
    if ($answer -notmatch '^(y|yes|s|si)$') {
        Write-Host "Annullato." -ForegroundColor Yellow
        exit 1
    }
} else {
    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
}

# Cartelle / file da escludere dalla copia
$excludeDirs = @(
    'node_modules',
    '.next',
    'out',
    'dist',
    'build',
    '.turbo',
    'coverage',
    'uploads',
    'tmp_zip_check',
    'logs_keep',
    'logs_after'
)

$excludeFiles = @(
    '*.lnk',
    'desktop.ini',
    'Thumbs.db',
    '*.zip',
    '*.PublishSettings',
    '*.publishsettings',
    '*.pubxml'
)

Write-Host "`nAvvio robocopy (mirror, escludendo build/node_modules/lnk)..." -ForegroundColor Green

$robocopyArgs = @(
    "`"$Source`"",
    "`"$Destination`"",
    '/E',           # subdirs incluse vuote NO -> usa /S? /E include vuote. Va bene.
    '/COPY:DAT',    # data, attributes, timestamps (no security/owner/auditing -> evita problemi cross-volume)
    '/R:2', '/W:2', # retry leggero
    '/NFL', '/NDL', # meno spam
    '/XD'
) + $excludeDirs + @('/XF') + $excludeFiles

# Esegui robocopy
& robocopy @robocopyArgs
$rc = $LASTEXITCODE
# robocopy: 0-7 = success (8+ = errore reale)
if ($rc -ge 8) {
    throw "robocopy ha riportato un errore (exit code $rc)."
}
Write-Host "robocopy completato (exit code $rc, normale: 0-7)." -ForegroundColor Green

# Verifica presenza file chiave
$mustExist = @('package.json', 'next.config.js', 'prisma\schema.prisma')
foreach ($f in $mustExist) {
    $p = Join-Path $Destination $f
    if (-not (Test-Path $p)) {
        Write-Warning "File atteso non trovato in destinazione: $f"
    }
}

# Reinstall opzionale
if ($RunInstall) {
    Push-Location $Destination
    try {
        if (Test-Path 'package-lock.json') {
            Write-Host "`nnpm ci nella nuova destinazione..." -ForegroundColor Cyan
            npm ci
        } else {
            Write-Host "`nnpm install nella nuova destinazione..." -ForegroundColor Cyan
            npm install
        }
    } finally {
        Pop-Location
    }
}

Write-Host @"

=========================================================
COPIA COMPLETATA.
Prossimi passi (manuali, NON automatizzati per sicurezza):

  1. Apri la nuova cartella in VS Code:
     code "$Destination"

  2. Verifica che 'npm run dev' / build funzionino.

  3. Solo dopo aver verificato, elimina la copia su OneDrive:
     Remove-Item "$Source" -Recurse -Force

  4. (Consigliato) inizializza Git remoto:
     cd "$Destination"
     git init
     git add .
     git commit -m "Initial import outside OneDrive"

  5. Aggiungi un remote privato (GitHub/Azure DevOps) e fai push.
=========================================================
"@ -ForegroundColor Yellow
