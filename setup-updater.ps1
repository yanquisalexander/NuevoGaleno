# Script de Configuración de Galeno Updater
# Este script ayuda a configurar las claves de firma para el sistema de actualizaciones

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Galeno Update - Setup de Claves" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si Tauri CLI está instalado
Write-Host "[1/4] Verificando Tauri CLI..." -ForegroundColor Yellow
$tauriInstalled = Get-Command cargo -ErrorAction SilentlyContinue
if (-not $tauriInstalled) {
    Write-Host "Error: Cargo no está instalado. Instala Rust primero." -ForegroundColor Red
    exit 1
}

# Preguntar si quiere instalar/actualizar Tauri CLI
Write-Host ""
$installCLI = Read-Host "¿Deseas instalar/actualizar Tauri CLI? (s/n)"
if ($installCLI -eq 's') {
    Write-Host "Instalando Tauri CLI..." -ForegroundColor Green
    cargo install tauri-cli --version "^2.0.0"
}

# Crear directorio para claves
Write-Host ""
Write-Host "[2/4] Preparando directorio de claves..." -ForegroundColor Yellow
$keyDir = "$env:USERPROFILE\.tauri"
if (-not (Test-Path $keyDir)) {
    New-Item -ItemType Directory -Path $keyDir | Out-Null
    Write-Host "Directorio creado: $keyDir" -ForegroundColor Green
} else {
    Write-Host "Directorio ya existe: $keyDir" -ForegroundColor Green
}

# Generar claves
Write-Host ""
Write-Host "[3/4] Generando par de claves..." -ForegroundColor Yellow
Write-Host "IMPORTANTE: Guarda la contraseña en un lugar seguro!" -ForegroundColor Red
Write-Host ""

$keyPath = "$keyDir\nuevogaleno.key"

# Verificar si ya existe una clave
if (Test-Path $keyPath) {
    Write-Host "Ya existe una clave en $keyPath" -ForegroundColor Yellow
    $overwrite = Read-Host "¿Deseas generar una nueva clave? (s/n)"
    if ($overwrite -ne 's') {
        Write-Host "Operación cancelada." -ForegroundColor Yellow
        exit 0
    }
    Remove-Item $keyPath
}

# Generar nueva clave
cargo tauri signer generate -w $keyPath

Write-Host ""
Write-Host "[4/4] Configuración de GitHub Secrets" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para completar la configuración, necesitas agregar los siguientes secrets en GitHub:" -ForegroundColor White
Write-Host ""
Write-Host "1. Ve a tu repositorio en GitHub" -ForegroundColor White
Write-Host "2. Settings -> Secrets and variables -> Actions" -ForegroundColor White
Write-Host "3. Click en 'New repository secret'" -ForegroundColor White
Write-Host ""
Write-Host "Secrets a crear:" -ForegroundColor Green
Write-Host "===============" -ForegroundColor Green
Write-Host ""
Write-Host "Secret 1: TAURI_PRIVATE_KEY" -ForegroundColor Yellow
Write-Host "Valor: Contenido del archivo $keyPath" -ForegroundColor White
Write-Host ""
Write-Host "Secret 2: TAURI_KEY_PASSWORD" -ForegroundColor Yellow
Write-Host "Valor: La contraseña que acabas de ingresar" -ForegroundColor White
Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Preguntar si quiere ver la clave privada
$showKey = Read-Host "¿Deseas ver el contenido de la clave privada ahora? (s/n)"
if ($showKey -eq 's') {
    Write-Host ""
    Write-Host "Clave privada (copia esto en TAURI_PRIVATE_KEY):" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Cyan
    Get-Content $keyPath
    Write-Host "=====================================" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Siguiente paso:" -ForegroundColor Green
Write-Host "1. Actualiza src-tauri/tauri.conf.json con la clave pública mostrada arriba" -ForegroundColor White
Write-Host "2. Actualiza el endpoint con tu usuario y repositorio de GitHub" -ForegroundColor White
Write-Host "3. Configura los secrets en GitHub" -ForegroundColor White
Write-Host ""
Write-Host "Configuración completada! ✓" -ForegroundColor Green
