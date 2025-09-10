#!/bin/bash

# SMTP MCP Server - Docker Setup Script

echo "🐳 SMTP MCP Server - Docker Setup"
echo "================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"

# Create required directories
echo "📁 Creating required directories..."
mkdir -p config logs data

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📋 Creating .env file from template..."
    cp .env.docker .env
    echo "⚠️  Please edit .env file with your SMTP credentials before starting!"
else
    echo "✅ .env file already exists"
fi

# Build the Docker image
echo "🔨 Building Docker image..."
docker build -t smtp-mcp-server .

if [ $? -eq 0 ]; then
    echo "✅ Docker image built successfully"
else
    echo "❌ Failed to build Docker image"
    exit 1
fi

# Check if user wants to start the service
read -p "🚀 Start the SMTP MCP Server now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🎯 Starting SMTP MCP Server..."
    docker-compose up -d
    
    # Wait a moment for the service to start
    sleep 5
    
    # Check if service is running
    if docker-compose ps | grep -q "Up"; then
        echo "✅ SMTP MCP Server is running!"
        echo "🌐 API available at: http://localhost:3008"
        echo "📖 API Documentation: http://localhost:3008/docs"
        echo "❤️  Health Check: http://localhost:3008/api/health"
        echo ""
        echo "📋 Useful commands:"
        echo "  View logs: docker-compose logs -f"
        echo "  Stop server: docker-compose down"
        echo "  Restart server: docker-compose restart"
    else
        echo "❌ Failed to start SMTP MCP Server"
        echo "📋 Check logs with: docker-compose logs"
    fi
else
    echo "📝 To start the server later, run: docker-compose up -d"
fi

echo ""
echo "🎉 Setup complete!"
echo "📚 Check the documentation for API usage examples."
