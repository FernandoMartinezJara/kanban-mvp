param()

Write-Host "Building and starting the Project Management MVP..."

Set-Location -Path "$(Split-Path -Path $MyInvocation.MyCommand.Path -Parent)\.."

docker-compose up --build -d

Write-Host "Application started at http://localhost:8000"
