param()

Write-Host "Stopping Project Management MVP..."

Set-Location -Path "$(Split-Path -Path $MyInvocation.MyCommand.Path -Parent)\.."

docker-compose down

Write-Host "Application stopped."
