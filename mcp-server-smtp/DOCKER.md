# Docker Deployment Guide - SMTP MCP Server

This guide covers deploying the SMTP MCP Server using Docker and Docker Compose with all the latest features including template management, CC/BCC support, and Gmail SMTP integration.

## 🚀 Quick Start

### Prerequisites
- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Docker Compose v2.0+
- Git (for cloning the repository)

### 1. Automated Setup (Recommended)

**Windows (PowerShell):**
```powershell
.\docker-setup.ps1
```

**Linux/Mac:**
```bash
chmod +x docker-setup.sh
./docker-setup.sh
```

### 2. Manual Setup

```bash
# Clone repository
git clone https://github.com/kkagain/smtp-server-kkagain.git
cd smtp-server-kkagain/mcp-server-smtp

# Create required directories
mkdir -p config logs data

# Copy and configure environment
cp .env.docker .env
# Edit .env with your SMTP credentials

# Build and start
docker-compose up --build -d
```

## 📋 Configuration

### Environment Variables (.env)

```bash
# Server Configuration
PORT=3008
NODE_ENV=production
LOG_LEVEL=info

# Database Configuration
DATABASE_TYPE=sqlite
SQLITE_DB_PATH=./data/smtp-server.db

# SMTP Configuration (Required)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password

# Security (Change for production)
JWT_SECRET=your-super-secret-jwt-key
API_KEY=your-api-key

# Features
ENABLE_TEMPLATES=true
ENABLE_RATE_LIMITING=true
ENABLE_BULK_EMAIL=true
ENABLE_SWAGGER=true
```

### Docker Compose Profiles

The full docker-compose configuration supports multiple profiles:

```bash
# Basic setup (default)
docker-compose up -d

# With PostgreSQL database
docker-compose --profile postgres up -d

# With Redis caching
docker-compose --profile redis up -d

# With Nginx reverse proxy
docker-compose --profile nginx up -d

# Full stack (all services)
docker-compose --profile postgres --profile redis --profile nginx up -d
```

## 🔧 Docker Files Overview

### Dockerfile Features
- **Multi-stage build** for smaller production images
- **Non-root user** for security (nodejs:nodejs)
- **Health checks** using `/api/health` endpoint
- **Signal handling** with dumb-init
- **Port 3008** exposure (updated from 3007)

### docker-compose.yml Features
- **Volume mounts** for persistent data (config, logs, data)
- **Environment variables** for configuration
- **Health checks** and restart policies
- **Network isolation** with custom network

### docker-compose.full.yml Features
- **PostgreSQL** database service
- **Redis** caching service
- **Nginx** reverse proxy
- **Service profiles** for selective deployment

## 🧪 Testing Docker Deployment

### Health Checks
```bash
# Container health
docker-compose ps

# API health
curl http://localhost:3008/api/health

# Service endpoints
curl http://localhost:3008/api/endpoints
```

### Template Testing
```bash
# List templates
curl http://localhost:3008/api/templates

# Send template email
curl -X POST http://localhost:3008/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": [{"email": "test@example.com"}],
    "templateId": "business-outreach",
    "templateData": {"name": "Docker User", "company": "Test Corp"}
  }'
```

### Email Features Testing
```bash
# CC/BCC email
curl -X POST http://localhost:3008/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": [{"email": "primary@example.com"}],
    "cc": [{"email": "cc@example.com"}],
    "bcc": [{"email": "bcc@example.com"}],
    "subject": "Docker Test",
    "html": "<h1>Success from Docker!</h1>"
  }'
```

## 📁 Persistent Data

### Volume Mounts
- **./config** → `/app/config` - SMTP configurations
- **./logs** → `/app/logs` - Application logs  
- **./data** → `/app/data` - SQLite database

### Data Backup
```bash
# Backup SQLite database
docker-compose exec smtp-mcp-server cp /app/data/smtp-server.db /app/logs/backup-$(date +%Y%m%d).db

# Copy backup to host
docker cp smtp-server:/app/logs/backup-20250907.db ./backups/
```

## 🔄 Updates and Maintenance

### Updating the Application
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up --build -d

# Check logs
docker-compose logs -f smtp-mcp-server
```

### Database Migration
```bash
# For SQLite (automatic)
# Database schema updates are handled automatically

# For PostgreSQL migration
docker-compose exec postgres psql -U smtp_user -d smtp_server -f /docker-entrypoint-initdb.d/migration.sql
```

## 🛡️ Security Considerations

### Production Deployment
1. **Change default secrets** in `.env`
2. **Use strong passwords** for database
3. **Enable HTTPS** with reverse proxy
4. **Update base images** regularly
5. **Monitor logs** for suspicious activity

### Secure Configuration
```bash
# Generate secure JWT secret
openssl rand -base64 64

# Generate API key
openssl rand -hex 32

# Update .env with secure values
```

## 🚨 Troubleshooting

### Common Issues

**Container won't start:**
```bash
# Check logs
docker-compose logs smtp-mcp-server

# Check environment
docker-compose exec smtp-mcp-server env | grep SMTP
```

**SMTP connection fails:**
```bash
# Test SMTP connectivity from container
docker-compose exec smtp-mcp-server telnet smtp.gmail.com 587

# Verify credentials
docker-compose exec smtp-mcp-server printenv | grep SMTP_
```

**Health check failing:**
```bash
# Manual health check
docker-compose exec smtp-mcp-server wget --spider http://localhost:3008/api/health

# Check port binding
docker port smtp-server 3008
```

**Permission issues:**
```bash
# Fix volume permissions
docker-compose exec --user root smtp-mcp-server chown -R nodejs:nodejs /app/data /app/logs /app/config
```

### Resource Monitoring
```bash
# Container resource usage
docker stats smtp-server

# Disk usage
docker system df
docker volume ls

# Network status
docker network inspect smtp-mcp-network
```

## 📊 Production Scaling

### Load Balancing
```yaml
# docker-compose.scale.yml
services:
  smtp-mcp-server:
    deploy:
      replicas: 3
  
  nginx:
    # Configure upstream load balancing
```

### Database Scaling
```yaml
# Use PostgreSQL for production
DATABASE_TYPE=postgres
DATABASE_URL=postgresql://user:pass@postgres:5432/smtp_server

# Add read replicas
postgres-replica:
  image: postgres:15-alpine
  environment:
    POSTGRES_MASTER_SERVICE: postgres
```

## 🎯 Performance Optimization

### Docker Image Optimization
- Multi-stage builds reduce image size
- Only production dependencies included
- Alpine base images for smaller footprint

### Runtime Optimization
```bash
# Adjust container resources
docker run --memory=512m --cpus=1.0 smtp-mcp-server

# Enable Docker BuildKit
export DOCKER_BUILDKIT=1
docker build -t smtp-mcp-server .
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [Node.js Docker Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [SMTP MCP Server API Documentation](http://localhost:3008/docs)

---

**Note:** This Docker setup includes all the latest features:
- ✅ Template management with alias endpoints
- ✅ CC/BCC email support
- ✅ Gmail SMTP integration
- ✅ Updated port configuration (3008)
- ✅ Health checks and monitoring
- ✅ Persistent data storage
- ✅ Security best practices
