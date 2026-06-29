# install-git-hooks.ps1
# Run this once after cloning: .\scripts\install-git-hooks.ps1
# Installs pre-commit hook that blocks secrets from being committed

$repoRoot = Split-Path $PSScriptRoot -Parent
$hooksSource = Join-Path $PSScriptRoot "hooks"
$hooksTarget = Join-Path $repoRoot ".git\hooks"

if (-not (Test-Path $hooksTarget)) {
    Write-Error "Not inside a git repository. Run this from the repo root."
    exit 1
}

Get-ChildItem $hooksSource | ForEach-Object {
    $dest = Join-Path $hooksTarget $_.Name
    Copy-Item $_.FullName $dest -Force
    Write-Host "Installed hook: $($_.Name)"
}

Write-Host ""
Write-Host "Git hooks installed. Commits containing hardcoded secrets will now be blocked."
