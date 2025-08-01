# VPS Deployment Guide

Deploy the Universal SMTP MCP Server on your Virtual Private Server (VPS) using Git-based deployment and production best practices.

## Prerequisites

- VPS with Ubuntu 20.04+ or similar Linux distribution
- Node.js 20+ installed
- Git installed
- PM2 for process management
- Nginx for reverse proxy
- SSL certificate (Let's Encrypt recommended)

## Quick VPS Setup

### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y

# Install Git
sudo apt install git -y

# Install Certbot for SSL
sudo apt install snapd -y
sudo snap install --classic certbot
```

### 2. Create Deployment User

```bash
# Create deployment user
sudo adduser smtp-deploy
sudo usermod -aG sudo smtp-deploy

# Switch to deployment user
sudo su - smtp-deploy

# Generate SSH key for Git
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"
cat ~/.ssh/id_rsa.pub  # Add this to your Git repository deploy keys
```

## Git-based Deployment

### 1. Repository Setup

```bash
# Clone repository
git clone https://github.com/your-username/smtp-mcp-server.git /home/smtp-deploy/smtp-server
cd /home/smtp-deploy/smtp-server

# Create production branch
git checkout -b production
git push origin production
```

### 2. Deployment Script

Create `/home/smtp-deploy/deploy.sh`:

```bash
#!/bin/bash
# Automated deployment script

set -e

DEPLOY_DIR="/home/smtp-deploy/smtp-server"
BACKUP_DIR="/home/smtp-deploy/backups"
SERVICE_NAME="smtp-server"

echo "🚀 Starting deployment..."

# Create backup
timestamp=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
cp -r $DEPLOY_DIR $BACKUP_DIR/backup_$timestamp

cd $DEPLOY_DIR

# Pull latest changes
echo "📦 Pulling latest changes..."
git fetch origin
git reset --hard origin/production

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production

# Build application
echo "🔨 Building application..."
npm run build

# Update PM2 ecosystem
echo "⚙️  Updating PM2 configuration..."
pm2 startOrReload ecosystem.config.js

# Health check
echo "🔍 Performing health check..."
sleep 5
if curl -f http://localhost:3008/api/health; then
    echo "✅ Deployment successful!"
    
    # Cleanup old backups (keep last 5)
    ls -1t $BACKUP_DIR | tail -n +6 | xargs -I {} rm -rf $BACKUP_DIR/{}
else
    echo "❌ Health check failed! Rolling back..."
    
    # Rollback to previous version
    latest_backup=$(ls -1t $BACKUP_DIR | head -n 1)
    rm -rf $DEPLOY_DIR
    cp -r $BACKUP_DIR/$latest_backup $DEPLOY_DIR
    pm2 restart $SERVICE_NAME
    
    echo "🔄 Rollback completed"
    exit 1
fi
```

### 3. PM2 Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'smtp-server',
    script: 'build/index.js',
    instances: 2,  // Use CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3008
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3008,
      // Add production environment variables
    },
    log_file: '/home/smtp-deploy/logs/smtp-server.log',
    error_file: '/home/smtp-deploy/logs/smtp-server-error.log',
    out_file: '/home/smtp-deploy/logs/smtp-server-out.log',
    time: true,
    max_memory_restart: '1G',
    restart_delay: 5000,
    max_restarts: 3,
    min_uptime: '10s',
    watch: false,
    ignore_watch: ['logs', 'data'],
    
    // Health monitoring
    health_check_url: 'http://localhost:3008/api/health',
    health_check_grace_period: 3000,
    
    // Auto restart on file changes (development only)
    watch: process.env.NODE_ENV !== 'production',
    
    // Graceful shutdown
    kill_timeout: 5000,
    listen_timeout: 3000,
    
    // Environment file
    env_file: '.env.production'
  }]
}
```

## Environment Configuration

### 1. Production Environment File

Create `.env.production`:

```bash
# Production Configuration
NODE_ENV=production
PORT=3008

# Database Configuration
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://smtp_user:secure_password@localhost:5432/smtp_production

# SMTP Configuration
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key

# Security
JWT_SECRET=your_very_long_and_secure_jwt_secret_for_production
API_KEY=your_production_api_key

# Features
ENABLE_RATE_LIMITING=true
ENABLE_SWAGGER=false
ENABLE_BULK_EMAIL=true

# Monitoring
LOG_LEVEL=info
SENTRY_DSN=your_sentry_dsn

# Performance
MAX_CONCURRENT_EMAILS=50
RATE_LIMIT_WINDOW=900000  # 15 minutes
RATE_LIMIT_MAX=100
```

### 2. Nginx Configuration

Create `/etc/nginx/sites-available/smtp-server`:

```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    
    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    
    location / {
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
        
        # Proxy to Node.js application
        proxy_pass http://127.0.0.1:3008;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }
    
    # Health check endpoint (no rate limiting)
    location /api/health {
        proxy_pass http://127.0.0.1:3008;
        access_log off;
    }
    
    # Static assets (if any)
    location /static/ {
        alias /home/smtp-deploy/smtp-server/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 3. Enable Nginx Configuration

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/smtp-server /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## SSL Certificate Setup

### 1. Let's Encrypt SSL

```bash
# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run

# Set up auto-renewal cron job
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

## Database Setup (PostgreSQL)

### 1. Install PostgreSQL

```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Database Configuration

```bash
# Switch to postgres user
sudo su - postgres

# Create database and user
createdb smtp_production
createuser --interactive smtp_user

# Set password for user
psql
\password smtp_user
\q

# Grant privileges
psql smtp_production
GRANT ALL PRIVILEGES ON DATABASE smtp_production TO smtp_user;
\q

exit
```

## Monitoring and Logging

### 1. PM2 Monitoring

```bash
# Install PM2 monitoring
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true

# Set up PM2 startup
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u smtp-deploy --hp /home/smtp-deploy

# Save PM2 configuration
pm2 save
```

### 2. System Monitoring

Create `/home/smtp-deploy/monitor.sh`:

```bash
#!/bin/bash
# System monitoring script

LOG_FILE="/home/smtp-deploy/logs/system-monitor.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Function to log with timestamp
log_with_timestamp() {
    echo "[$TIMESTAMP] $1" >> $LOG_FILE
}

# Check disk space
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 85 ]; then
    log_with_timestamp "WARNING: Disk usage is at ${DISK_USAGE}%"
fi

# Check memory usage
MEM_USAGE=$(free | grep Mem | awk '{printf("%.2f", $3/$2 * 100.0)}')
if (( $(echo "$MEM_USAGE > 90" | bc -l) )); then
    log_with_timestamp "WARNING: Memory usage is at ${MEM_USAGE}%"
fi

# Check if service is running
if ! pm2 describe smtp-server > /dev/null 2>&1; then
    log_with_timestamp "ERROR: SMTP server is not running"
    pm2 restart smtp-server
fi

# Check application health
HTTP_STATUS=$(curl -o /dev/null -s -w "%{http_code}" http://localhost:3008/api/health)
if [ $HTTP_STATUS -ne 200 ]; then
    log_with_timestamp "ERROR: Health check failed with status $HTTP_STATUS"
fi
```

### 3. Automated Monitoring

```bash
# Add monitoring to crontab
crontab -e

# Add these lines:
# Run monitoring every 5 minutes
*/5 * * * * /home/smtp-deploy/monitor.sh

# Backup logs daily
0 2 * * * tar -czf /home/smtp-deploy/backups/logs_$(date +\%Y\%m\%d).tar.gz /home/smtp-deploy/logs/
```

## Deployment Process

### 1. Initial Deployment

```bash
# Make deployment script executable
chmod +x /home/smtp-deploy/deploy.sh

# Run initial deployment
./deploy.sh

# Start application
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save
```

### 2. Automated Deployment with Git Hooks

Create `/home/smtp-deploy/smtp-server/.git/hooks/post-receive`:

```bash
#!/bin/bash
# Git post-receive hook for automated deployment

cd /home/smtp-deploy/smtp-server
export NODE_ENV=production

echo "🚀 Deploying latest changes..."

# Checkout latest changes
git --git-dir=/home/smtp-deploy/smtp-server/.git --work-tree=/home/smtp-deploy/smtp-server checkout production -f

# Run deployment script
/home/smtp-deploy/deploy.sh

echo "✅ Deployment completed!"
```

```bash
# Make hook executable
chmod +x /home/smtp-deploy/smtp-server/.git/hooks/post-receive
```

### 3. Deploy from Local Machine

```bash
# Add VPS as remote
git remote add production smtp-deploy@your-server-ip:/home/smtp-deploy/smtp-server/.git

# Deploy to production
git push production main:production
```

## Security Hardening

### 1. Firewall Configuration

```bash
# Install and configure UFW
sudo ufw enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow from 127.0.0.1 to any port 3008  # Only localhost access to app
```

### 2. Fail2Ban Setup

```bash
# Install Fail2Ban
sudo apt install fail2ban -y

# Configure Fail2Ban for Nginx
sudo tee /etc/fail2ban/jail.local << EOF
[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
EOF

sudo systemctl restart fail2ban
```

## Troubleshooting

### Common Issues

1. **Application won't start**
   ```bash
   # Check PM2 logs
   pm2 logs smtp-server
   
   # Check system logs
   sudo journalctl -u nginx -f
   ```

2. **SSL certificate issues**
   ```bash
   # Check certificate status
   sudo certbot certificates
   
   # Renew certificate
   sudo certbot renew
   ```

3. **Database connection problems**
   ```bash
   # Check PostgreSQL status
   sudo systemctl status postgresql
   
   # Test database connection
   psql -h localhost -U smtp_user -d smtp_production
   ```

## Maintenance Tasks

### Daily
- Check application logs
- Monitor disk space
- Verify backup completion

### Weekly
- Update system packages
- Review security logs
- Performance analysis

### Monthly
- Rotate log files
- Update dependencies
- Security audit

## Next Steps

- Set up monitoring dashboards (Grafana)
- Implement log aggregation (ELK Stack)
- Configure backup strategies
- Set up CI/CD pipelines
- Implement blue-green deployments
