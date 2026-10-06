param(
    [ValidateSet('Debug', 'Release')][string]$Variant = 'Debug',
    [string]$OutputDirectory = ''
)
$ErrorActionPreference = 'Stop'
$projectDir = Split-Path -Parent $PSScriptRoot
if (!$OutputDirectory) { $OutputDirectory = Join-Path $projectDir 'release-artifacts' }
$OutputDirectory = [System.IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$previousJava = $env:JAVA_HOME
$signingVariables = @('BUSBENDE_KEYSTORE_PATH','BUSBENDE_KEYSTORE_PASSWORD','BUSBENDE_KEY_ALIAS','BUSBENDE_KEY_PASSWORD')
$previousSigning = @{}
foreach ($name in $signingVariables) { $previousSigning[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
$previousLocation = Get-Location
function Invoke-CheckedNative([string]$Program, [string[]]$Arguments) {
    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & $Program @Arguments
        $code = $LASTEXITCODE
    } finally { $ErrorActionPreference = $previousPreference }
    if ($code -ne 0) { throw "$Program mislukt (exit $code)." }
}
try {
    $javaCandidates = @('C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot', (Join-Path $env:USERPROFILE '.jdks\jbr-21.0.11'), $previousJava)
    $javaDir = $javaCandidates | Where-Object { $_ -and (Test-Path -LiteralPath (Join-Path $_ 'bin\java.exe')) } | Select-Object -First 1
    if (!$javaDir) { throw 'Installeer Java 21 of stel JAVA_HOME in.' }
    $env:JAVA_HOME = $javaDir
    if ($Variant -eq 'Release' -and !$env:BUSBENDE_KEYSTORE_PATH) {
        $credentials = Import-Clixml -LiteralPath (Join-Path $projectDir '.release-signing\credentials.xml')
        $env:BUSBENDE_KEYSTORE_PATH = Join-Path $projectDir '.release-signing\busbende-upload.p12'
        $env:BUSBENDE_KEY_ALIAS = $credentials.UserName
        $env:BUSBENDE_KEYSTORE_PASSWORD = $credentials.GetNetworkCredential().Password
        $env:BUSBENDE_KEY_PASSWORD = $env:BUSBENDE_KEYSTORE_PASSWORD
    }
    Set-Location -LiteralPath $projectDir
    Invoke-CheckedNative 'npm.cmd' @('run','build')
    Invoke-CheckedNative 'npx.cmd' @('cap','copy','android')
    Set-Location -LiteralPath (Join-Path $projectDir 'android')
    $task = if ($Variant -eq 'Release') { 'bundleRelease' } else { 'assembleDebug' }
    Invoke-CheckedNative '.\gradlew.bat' @($task, '--no-daemon')
    $artifact = if ($Variant -eq 'Release') { 'app\build\outputs\bundle\release\app-release.aab' } else { 'app\build\outputs\apk\debug\app-debug.apk' }
    $destination = if ($Variant -eq 'Release') { 'BusBende-release.aab' } else { 'BusBende-test.apk' }
    Copy-Item -LiteralPath $artifact -Destination (Join-Path $OutputDirectory $destination) -Force
    Write-Host "Klaar: $(Join-Path $OutputDirectory $destination)"
} finally {
    foreach ($name in $signingVariables) { [Environment]::SetEnvironmentVariable($name, $previousSigning[$name], 'Process') }
    $env:JAVA_HOME = $previousJava
    Set-Location -LiteralPath $previousLocation
}
