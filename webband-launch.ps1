$ErrorActionPreference = 'Stop'
$repo = $PSScriptRoot
$index = Join-Path $repo 'index.html'

Add-Type -AssemblyName System.Windows.Forms | Out-Null

function Show-Ask($msg) {
    return [System.Windows.Forms.MessageBox]::Show(
        $msg, 'Webband',
        [System.Windows.Forms.MessageBoxButtons]::YesNo,
        [System.Windows.Forms.MessageBoxIcon]::Question)
}
function Show-Info($msg) {
    [System.Windows.Forms.MessageBox]::Show(
        $msg, 'Webband',
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Information) | Out-Null
}

function Open-Chrome {
    $url = ([Uri]$index).AbsoluteUri
    $paths = @(
        "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
        "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe")
    $chrome = $paths | Where-Object { Test-Path $_ } | Select-Object -First 1
    if ($chrome) { Start-Process $chrome $url } else { Start-Process $url }
}

function Get-Ver($text) {
    if ($text -match "no:\s*'([^']+)'") { return $Matches[1] }
    return '?'
}

try {
    Set-Location $repo

    git fetch origin main --quiet 2>$null
    if ($?) {
        $localVer  = Get-Ver ((Get-Content (Join-Path $repo 'app.js') -TotalCount 20) | Out-String)
        $remoteVer = Get-Ver (git show origin/main:app.js 2>$null | Select-Object -First 20 | Out-String)

        $behind = $false
        git merge-base --is-ancestor origin/main HEAD 2>$null
        if (-not $?) { $behind = $true }

        if ($behind) {
            $dirty = (git status --porcelain) -ne $null -and (git status --porcelain).Length -gt 0
            if ($dirty) {
                Show-Info "Yerelde kaydedilmemiş değişiklik var, güncelleme atlandı. Mevcut sürüm ($localVer) açılıyor."
            }
            else {
                $ans = Show-Ask "Serkan'in reposunda daha yeni bir surum var.`n`nYerel: $localVer   ->   En guncel: $remoteVer`n`nKendimi en guncel surume guncelleyeyim mi?"
                if ($ans -eq [System.Windows.Forms.DialogResult]::Yes) {
                    git checkout -B main origin/main --quiet
                    Show-Info "Guncellendi: $remoteVer. Oyun aciliyor."
                }
            }
        }
    }
    else {
        Show-Info "Serkan'in reposuna ulasilamadi (cevrimdisi olabilirsin). Mevcut surum aciliyor."
    }
}
catch {
    Show-Info ("Guncelleme kontrolu atlandi: " + $_.Exception.Message + "`nMevcut surum aciliyor.")
}
finally {
    Open-Chrome
}
