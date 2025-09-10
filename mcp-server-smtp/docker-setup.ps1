# SMTP MCP Server - Docker Setup Script (PowerShell)

Write-Host "🐳 SMTP MCP Server - Docker Setup" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Check if Docker is installed
try {
    docker --version | Out-Null
    Write-Host "✅ Docker is installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not installed. Please install Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Check if docker-compose is available
try {
    docker-compose --version | Out-Null
    Write-Host "✅ Docker Compose is available" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Compose is not available. Please ensure Docker Desktop includes Compose." -ForegroundColor Red
    exit 1
}

# Create required directories
Write-Host "📁 Creating required directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path config, logs, data | Out-Null

# Copy environment file if it doesn't exist
if (-not (Test-Path ".env")) {
    Write-Host "📋 Creating .env file from template..." -ForegroundColor Yellow
    Copy-Item ".env.docker" ".env"
    Write-Host "⚠️  Please edit .env file with your SMTP credentials before starting!" -ForegroundColor Red
} else {
    Write-Host "✅ .env file already exists" -ForegroundColor Green
}

# Build the Docker image
Write-Host "🔨 Building Docker image..." -ForegroundColor Yellow
docker build -t smtp-mcp-server .

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Docker image built successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to build Docker image" -ForegroundColor Red
    exit 1
}

# Check if user wants to start the service
$response = Read-Host "🚀 Start the SMTP MCP Server now? (y/n)"
if ($response -match "^[Yy]") {
    Write-Host "🎯 Starting SMTP MCP Server..." -ForegroundColor Yellow
    docker-compose up -d
    
    # Wait a moment for the service to start
    Start-Sleep -Seconds 5
    
    # Check if service is running
    $status = docker-compose ps
    if ($status -match "Up") {
        Write-Host "✅ SMTP MCP Server is running!" -ForegroundColor Green
        Write-Host "🌐 API available at: http://localhost:3008" -ForegroundColor Cyan
        Write-Host "📖 API Documentation: http://localhost:3008/docs" -ForegroundColor Cyan
        Write-Host "❤️  Health Check: http://localhost:3008/api/health" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "📋 Useful commands:" -ForegroundColor Yellow
        Write-Host "  View logs: docker-compose logs -f"
        Write-Host "  Stop server: docker-compose down"
        Write-Host "  Restart server: docker-compose restart"
    } else {
        Write-Host "❌ Failed to start SMTP MCP Server" -ForegroundColor Red
        Write-Host "📋 Check logs with: docker-compose logs" -ForegroundColor Yellow
    }
} else {
    Write-Host "📝 To start the server later, run: docker-compose up -d" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Setup complete!" -ForegroundColor Green
Write-Host "📚 Check the documentation for API usage examples." -ForegroundColor Cyan
