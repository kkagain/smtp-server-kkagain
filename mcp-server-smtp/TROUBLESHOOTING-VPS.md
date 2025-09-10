# VPS SMTP Configuration Troubleshooting

## 🚨 Issue: SMTP server using smtp.example.com instead of your configuration

This means your SMTP server on the VPS is not loading the environment variables properly.

## 🔍 Step 1: Check Environment Variables on VPS

SSH into your VPS and run these commands:

```bash
# Check if .env file exists
ls -la /path/to/your/smtp-server/.env

# Check environment variables are loaded
cd /path/to/your/smtp-server
cat .env | grep SMTP

# Check if Docker container has the environment variables
docker exec smtp-server env | grep SMTP

# Or if running with PM2/Node directly
ps aux | grep node
```

## 🔧 Step 2: Verify .env File Content

Your `.env` file on the VPS should contain:

```bash
# SMTP Configuration (REQUIRED)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password

# Other required variables
NODE_ENV=production
PORT=3008
API_KEY=your-api-key
JWT_SECRET=your-jwt-secret
```

## 🔧 Step 3: Check Docker Configuration

If using Docker, ensure your docker-compose.yml includes:

```yaml
version: '3.8'
services:
  smtp-server:
    build: .
    ports:
      - "3008:3008"
    env_file:
      - .env  # This line is CRITICAL
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

## 🔧 Step 4: Restart Services

After fixing the environment variables:

```bash
# If using Docker
docker-compose down
docker-compose up -d

# If using PM2
pm2 restart smtp-server

# If running directly
pkill -f "node.*smtp"
NODE_ENV=production node build/index.js
```

## 🔍 Step 5: Test Configuration Loading

Create this test file on your VPS to verify config loading:

```javascript
// test-config.js
require('dotenv').config();

console.log('Environment Variables:');
console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('SMTP_PASS:', process.env.SMTP_PASS ? '[SET]' : '[NOT SET]');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);

// Test the config loading function
const config = require('./build/config');
console.log('\nConfig loaded:');
config.getDefaultSmtpConfig().then(smtpConfig => {
  console.log('SMTP Config:', {
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    user: smtpConfig.auth?.user || '[NOT SET]'
  });
}).catch(err => {
  console.error('Config loading error:', err);
});
```

Run it:
```bash
cd /path/to/your/smtp-server
node test-config.js
```

## 🔧 Common Fixes

### Fix 1: Missing .env file
```bash
# Copy from template
cp .env.production .env
# Edit with your actual credentials
nano .env
```

### Fix 2: Docker not loading .env
```bash
# Check docker-compose.yml has env_file
grep -A 10 -B 5 "env_file" docker-compose.yml

# If missing, add it:
# env_file:
#   - .env
```

### Fix 3: Environment variables not exported
```bash
# If running without Docker, export variables
export SMTP_HOST=smtp.gmail.com
export SMTP_USER=your-email@gmail.com
export SMTP_PASS=your-app-password
```

### Fix 4: File permissions
```bash
# Fix .env file permissions
chmod 600 .env
chown $USER:$USER .env
```

## 🎯 Quick Fix Commands

Run these on your VPS:

```bash
# Navigate to your SMTP server directory
cd /path/to/your/smtp-server

# Check if .env exists
if [ ! -f .env ]; then
  echo "❌ .env file missing!"
  echo "Create .env file with your SMTP credentials"
else
  echo "✅ .env file exists"
fi

# Check SMTP variables
echo "Checking environment variables:"
grep "SMTP_" .env 2>/dev/null || echo "❌ No SMTP variables found in .env"

# Restart service
echo "Restarting SMTP server..."
if command -v docker-compose &> /dev/null; then
  docker-compose restart
elif command -v pm2 &> /dev/null; then
  pm2 restart smtp-server
else
  echo "Manual restart required"
fi

# Test the server
echo "Testing server health..."
curl -s http://localhost:3008/api/health || echo "❌ Server not responding"
```
