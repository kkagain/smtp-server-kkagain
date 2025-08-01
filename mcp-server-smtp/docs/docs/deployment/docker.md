# Docker Deployment

Deploy the Universal SMTP MCP Server using Docker for consistent, scalable production environments.

## Quick Docker Setup

### 1. Using Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-username/smtp-mcp-server.git
cd smtp-mcp-server

# Start with Docker Compose
docker-compose up -d
```

This starts:
- SMTP MCP Server (port 3008)
- PostgreSQL database
- Redis for caching
- Optional management tools

### 2. Using Docker Build

```bash
# Build the image
npm run docker:build

# Run the container
npm run docker:run
```

## Docker Configuration

### docker-compose.yml

```yaml
version: '3.8'

services:
  smtp-server:
    build: .
    ports:
      - "3008:3008"
    environment:
      - NODE_ENV=production
      - PORT=3008
      - DATABASE_URL=postgresql://user:password@postgres:5432/smtp_db
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3008/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: smtp_db
      POSTGRES_USER: smtp_user
      POSTGRES_PASSWORD: your_secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### Dockerfile

```dockerfile
# Multi-stage build for production
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Production image
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S smtp -u 1001

# Copy built application
COPY --from=builder --chown=smtp:nodejs /app/build ./build
COPY --from=builder --chown=smtp:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=smtp:nodejs /app/package.json ./

# Create directories
RUN mkdir -p data logs && \
    chown -R smtp:nodejs data logs

# Switch to non-root user
USER smtp

EXPOSE 3008

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3008/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["node", "build/index.js"]
```

## Production Environment

### Environment Variables

Create a `.env.production` file:

```bash
# Production Configuration
NODE_ENV=production
PORT=3008

# Database (PostgreSQL recommended for production)
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://smtp_user:your_password@postgres:5432/smtp_db

# Redis for caching and rate limiting
REDIS_URL=redis://redis:6379

# SMTP Configuration
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key

# Security
JWT_SECRET=your_production_jwt_secret_very_long_and_secure
API_KEY=your_production_api_key

# Features
ENABLE_RATE_LIMITING=true
ENABLE_BULK_EMAIL=true
ENABLE_TEMPLATES=true
ENABLE_SWAGGER=false  # Disable in production

# Monitoring
LOG_LEVEL=info
SENTRY_DSN=your_sentry_dsn_for_error_tracking
```

## Security Best Practices

### 1. Use Secrets Management

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  smtp-server:
    build: .
    environment:
      - NODE_ENV=production
    secrets:
      - smtp_password
      - jwt_secret
      - api_key
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M

secrets:
  smtp_password:
    external: true
  jwt_secret:
    external: true
  api_key:
    external: true
```

### 2. Network Security

```yaml
# Add network isolation
networks:
  smtp-network:
    driver: bridge
    internal: true
  web-network:
    driver: bridge

services:
  smtp-server:
    networks:
      - smtp-network
      - web-network
    
  postgres:
    networks:
      - smtp-network  # Internal only
```

## Scaling and High Availability

### 1. Load Balancer Setup

```yaml
# docker-compose.scale.yml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl
    depends_on:
      - smtp-server
    restart: unless-stopped

  smtp-server:
    deploy:
      replicas: 3
    environment:
      - CLUSTER_MODE=true
```

### 2. Nginx Configuration

```nginx
# nginx.conf
upstream smtp_backend {
    least_conn;
    server smtp-server_1:3008;
    server smtp-server_2:3008;
    server smtp-server_3:3008;
}

server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://smtp_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Health check
        location /api/health {
            proxy_pass http://smtp_backend;
            access_log off;
        }
    }
}
```

## Monitoring and Logging

### 1. Docker Compose with Monitoring

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  smtp-server:
    # ... existing config ...
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  grafana_data:
```

### 2. Health Monitoring

```bash
# Health check script
#!/bin/bash
# healthcheck.sh

HEALTH_URL="http://localhost:3008/api/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $RESPONSE -eq 200 ]; then
    echo "Service is healthy"
    exit 0
else
    echo "Service is unhealthy (HTTP $RESPONSE)"
    exit 1
fi
```

## Deployment Commands

### Development Deployment

```bash
# Start development environment
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# View logs
docker-compose logs -f smtp-server

# Scale services
docker-compose up --scale smtp-server=3 -d
```

### Production Deployment

```bash
# Production deployment
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Zero-downtime updates
docker-compose pull smtp-server
docker-compose up -d --no-deps smtp-server

# Backup database
docker-compose exec postgres pg_dump -U smtp_user smtp_db > backup.sql
```

## Troubleshooting

### Container Issues

```bash
# Check container status
docker-compose ps

# View container logs
docker-compose logs smtp-server

# Access container shell
docker-compose exec smtp-server sh

# Check resource usage
docker stats
```

### Common Problems

1. **Container won't start**
   ```bash
   # Check logs for errors
   docker-compose logs smtp-server
   
   # Verify environment variables
   docker-compose config
   ```

2. **Database connection issues**
   ```bash
   # Test database connectivity
   docker-compose exec smtp-server node -e "console.log('Testing DB connection...')"
   ```

3. **Email sending fails**
   ```bash
   # Check SMTP configuration
   docker-compose exec smtp-server env | grep SMTP
   ```

## Maintenance

### Backup and Restore

```bash
# Backup
docker-compose exec postgres pg_dump -U smtp_user smtp_db > backup.sql
docker-compose exec redis redis-cli BGSAVE

# Restore
docker-compose exec -T postgres psql -U smtp_user smtp_db < backup.sql
```

### Updates

```bash
# Update images
docker-compose pull

# Restart with new images
docker-compose up -d

# Clean up old images
docker image prune -f
```

## Next Steps

- Configure [VPS Deployment](./vps.md) for cloud hosting
- Set up monitoring and alerting
- Implement backup strategies
- Configure SSL/TLS certificates
- Set up CI/CD pipelines for automated deployments
