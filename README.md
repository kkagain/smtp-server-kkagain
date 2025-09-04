# SMTP MCP Server - Enterprise Email Platform

A comprehensive **Model Context Protocol (MCP) server** for SMTP email operations with enterprise-grade features including advanced tracking, analytics, campaign management, and multi-database support. Perfect for AI agents and applications requiring professional email capabilities.

## 🚀 Enhanced Features

### 🔥 Core Email Platform
- **Dual Protocol Support**: MCP and RESTful API interfaces
- **Advanced Email Operations**: Send, track, and analyze emails with comprehensive logging
- **Real-time Analytics**: Geographic insights, open/click tracking, bounce handling
- **Multi-Database Support**: SQLite (development), PostgreSQL, Supabase (production)
- **Campaign Management**: Bulk sending, templates, contact lists, and performance analytics
- **Enterprise Security**: JWT authentication, rate limiting, CORS protection

### 📊 Professional Tracking & Analytics
- **Email Tracking**: Pixel-based open tracking, click tracking with redirects
- **Geographic Analytics**: IP-based location detection (country/city level)
- **Event Timeline**: Complete email journey from send to engagement
- **Performance Metrics**: Delivery rates, engagement rates, geographic distribution
- **Real-time Dashboard**: Live email performance monitoring

### 🗄️ Advanced Database Integration
- **Multi-Database**: SQLite, PostgreSQL, Supabase with automatic migration
- **Comprehensive Schema**: 15+ tables for users, campaigns, tracking, analytics
- **User Authentication**: Supabase Auth integration with Row Level Security
- **Contact Management**: Full CRUD operations with custom fields and segmentation
- **Campaign Analytics**: Real-time performance tracking and reporting

### 🔐 Enterprise Security & Authentication
- **User-Based SMTP Configs**: Each user manages their own SMTP credentials
- **JWT Authentication**: Secure API access with Supabase Auth integration
- **Row Level Security**: Database-level access control
- **Rate Limiting**: IP-based request throttling and email sending limits
- **CORS Protection**: Configurable cross-origin request security

### 🌍 Geographic & Engagement Tracking
- **IP Geolocation**: Real-time country/city detection using geoip-lite
- **Open Tracking**: Invisible pixel tracking with timestamp recording
- **Click Tracking**: Automatic link wrapping with redirect analytics
- **User Agent Detection**: Browser/device identification
- **Bounce Handling**: Automatic bounce classification and processing

## 📋 Prerequisites

- **Node.js** 18 or higher
- **npm** or **yarn**
- Access to an SMTP server (Gmail, Outlook, SendGrid, etc.)

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/smtp-server-kkagain.git
cd smtp-server-kkagain/mcp-server-smtp
```

### 2. Quick Setup (Recommended)
```bash
npm run setup
```
This command will:
- Install all dependencies
- Create `.env` file from template
- Build the project
- Display next steps

### 3. Manual Setup
If you prefer manual setup:

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
notepad .env  # Windows
nano .env     # Linux/macOS

# Build the project
npm run build
```

### 4. Configure SMTP Settings
Create your first SMTP configuration by running the server and using the `add-smtp-config` tool, or manually edit the configuration file at `~/.config/smtp-mcp-server/config.json`.

## 🚀 Quick Start

### Start the Server
```bash
npm start
```

The server will start on port 3007 by default. You can change this by setting the `PORT` environment variable:

```bash
PORT=8080 npm start
```

## 🐳 Docker Deployment

### Quick Docker Setup

```bash
# Build the Docker image
docker build -t smtp-mcp-server .

# Run with environment file
docker run -d \
  --name smtp-server \
  -p 3007:3007 \
  -p 4000:4000 \
  --env-file .env \
  smtp-mcp-server

# Check logs
docker logs smtp-server
```

### Docker Compose (Recommended for Production)

Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  smtp-server:
    build: ./mcp-server-smtp
    ports:
      - "3007:3007"  # MCP/HTTP Server
      - "4000:4000"  # API Server
      - "3000:3000"  # Tracking Server
    environment:
      - NODE_ENV=production
      - DATABASE_TYPE=postgres
      - REDIS_URL=redis://redis:6379
      - POSTGRES_HOST=postgres
      - POSTGRES_DB=smtp_server
      - POSTGRES_USER=smtp_user
      - POSTGRES_PASSWORD=secure_password
    depends_on:
      - postgres
      - redis
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: smtp_server
      POSTGRES_USER: smtp_user
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/schema.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### Start with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🚀 VPS Deployment with GitHub Actions

### 1. GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy SMTP MCP Server to VPS

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: 'mcp-server-smtp/package-lock.json'
    
    - name: Install dependencies
      run: |
        cd mcp-server-smtp
        npm ci --only=production
    
    - name: Build project
      run: |
        cd mcp-server-smtp
        npm run build
    
    - name: Create deployment package
      run: |
        tar -czf deployment.tar.gz \
          mcp-server-smtp/dist \
          mcp-server-smtp/package.json \
          mcp-server-smtp/database \
          mcp-server-smtp/.env.example \
          docker-compose.yml \
          Dockerfile
    
    - name: Deploy to VPS
      uses: appleboy/ssh-action@v1.0.0
      with:
        host: ${{ secrets.VPS_HOST }}
        username: ${{ secrets.VPS_USERNAME }}
        key: ${{ secrets.VPS_SSH_KEY }}
        port: ${{ secrets.VPS_PORT || 22 }}
        script: |
          # Create deployment directory
          sudo mkdir -p /opt/smtp-server
          cd /opt/smtp-server
          
          # Backup current deployment
          if [ -d "current" ]; then
            sudo mv current backup-$(date +%Y%m%d-%H%M%S)
          fi
          
          # Clone/update repository
          if [ ! -d "smtp-server-kkagain" ]; then
            sudo git clone https://github.com/${{ github.repository }}.git smtp-server-kkagain
          else
            cd smtp-server-kkagain
            sudo git pull origin main
            cd ..
          fi
          
          # Create symlink to current
          sudo ln -sfn smtp-server-kkagain current
          
          # Navigate to project
          cd current/mcp-server-smtp
          
          # Install dependencies and build
          sudo npm ci --only=production
          sudo npm run build
          
          # Restart services with Docker Compose
          cd ..
          sudo docker-compose down
          sudo docker-compose up -d --build
          
          # Clean up old backups (keep last 5)
          cd /opt/smtp-server
          sudo ls -dt backup-* | tail -n +6 | sudo xargs rm -rf || true

    - name: Verify deployment
      uses: appleboy/ssh-action@v1.0.0
      with:
        host: ${{ secrets.VPS_HOST }}
        username: ${{ secrets.VPS_USERNAME }}
        key: ${{ secrets.VPS_SSH_KEY }}
        port: ${{ secrets.VPS_PORT || 22 }}
        script: |
          cd /opt/smtp-server
          
          # Check if services are running
          sudo docker-compose ps
          
          # Test health endpoint
          sleep 10
          curl -f http://localhost:4000/health || exit 1
          
          echo "✅ Deployment successful!"
```

### 2. VPS Initial Setup

Run these commands on your VPS:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose
sudo apt install -y docker.io docker-compose git curl

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to docker group
sudo usermod -aG docker $USER

# Create directory structure
sudo mkdir -p /opt/smtp-server
sudo chown $USER:$USER /opt/smtp-server

# Configure firewall (if ufw is enabled)
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw allow 3007  # MCP Server (optional, for testing)
sudo ufw allow 4000  # API Server

# Setup reverse proxy with Nginx (optional)
sudo apt install -y nginx

# Create Nginx configuration
sudo tee /etc/nginx/sites-available/smtp-server << EOF
server {
    listen 80;
    server_name your-domain.com;
    
    # API endpoints
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Tracking endpoints
    location /track/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:4000/health;
    }
}
EOF

# Enable the site
sudo ln -s /etc/nginx/sites-available/smtp-server /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3. Required GitHub Secrets

Add these secrets in your GitHub repository settings:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `VPS_HOST` | Your VPS IP address | `123.45.67.89` |
| `VPS_USERNAME` | SSH username | `ubuntu` or `root` |
| `VPS_SSH_KEY` | Private SSH key | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `VPS_PORT` | SSH port (optional) | `22` |

### 4. Environment Configuration on VPS

Create `.env` file on your VPS at `/opt/smtp-server/current/mcp-server-smtp/.env`:

```bash
# Production Environment Configuration
NODE_ENV=production
SERVER_MODE=api

# Database (use PostgreSQL for production)
DATABASE_TYPE=postgres
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=smtp_server
POSTGRES_USER=smtp_user
POSTGRES_PASSWORD=your_secure_password

# Redis
REDIS_URL=redis://redis:6379

# API Configuration
API_PORT=4000
TRACKING_PORT=3000

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this
CORS_ORIGIN=https://your-domain.com
API_KEY_REQUIRED=true
API_KEY=your-api-key

# Email Tracking
TRACKING_DOMAIN=https://your-domain.com
ENABLE_EMAIL_TRACKING=true
ENABLE_OPEN_TRACKING=true
ENABLE_CLICK_TRACKING=true

# Monitoring
ENABLE_HEALTH_CHECKS=true
LOG_LEVEL=info
```

## 🔐 Supabase Integration with User Authentication

### Database Schema for Multi-User Support

```sql
-- Enable Row Level Security
ALTER DATABASE smtp_server SET row_security = on;

-- User SMTP configurations table
CREATE TABLE user_smtp_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL, -- References Supabase auth.users(id)
  name VARCHAR(255) NOT NULL,
  host VARCHAR(255) NOT NULL,
  port INTEGER NOT NULL DEFAULT 587,
  secure BOOLEAN DEFAULT false,
  username VARCHAR(255) NOT NULL,
  password_encrypted TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Create indexes
CREATE INDEX idx_user_smtp_configs_user_id ON user_smtp_configs(user_id);
CREATE INDEX idx_user_smtp_configs_is_default ON user_smtp_configs(user_id, is_default) WHERE is_default = true;

-- Row Level Security policies
ALTER TABLE user_smtp_configs ENABLE ROW LEVEL SECURITY;

-- Users can only access their own SMTP configs
CREATE POLICY "Users can manage own SMTP configs" ON user_smtp_configs
  USING (user_id = current_setting('app.current_user_id')::uuid);

-- Function to set current user context
CREATE OR REPLACE FUNCTION set_current_user_id(user_uuid UUID)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_uuid::text, true);
END;
$$ LANGUAGE plpgsql;
```

### Authentication Middleware for SMTP Server

Add to `src/middleware/auth.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import { Request, Response, NextFunction } from 'express';

interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: any;
}

export const authenticateUser = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }
    
    const token = authHeader.substring(7);
    
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    req.userId = user.id;
    req.user = user;
    
    // Set user context for RLS
    await supabase.rpc('set_current_user_id', { user_uuid: user.id });
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

export const getUserSmtpConfig = async (userId: string, configId?: string) => {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  
  // Set user context for RLS
  await supabase.rpc('set_current_user_id', { user_uuid: userId });
  
  let query = supabase
    .from('user_smtp_configs')
    .select('*')
    .eq('is_active', true);
  
  if (configId) {
    query = query.eq('id', configId);
  } else {
    query = query.eq('is_default', true);
  }
  
  const { data, error } = await query.single();
  
  if (error || !data) {
    throw new Error('SMTP configuration not found');
  }
  
  // Decrypt password (implement your encryption/decryption logic)
  const decryptedPassword = decrypt(data.password_encrypted);
  
  return {
    id: data.id,
    name: data.name,
    host: data.host,
    port: data.port,
    secure: data.secure,
    auth: {
      user: data.username,
      pass: decryptedPassword
    }
  };
};
```

### Client Integration Example

For AI agents using this SMTP server:

```typescript
// AI Agent Integration with Authentication
class AuthenticatedEmailService {
  private supabaseUrl = process.env.SUPABASE_URL!;
  private supabaseKey = process.env.SUPABASE_ANON_KEY!;
  private smtpApiUrl = process.env.SMTP_API_URL!;
  
  async sendEmailForUser(userToken: string, emailData: any) {
    try {
      // Validate user token
      const supabase = createClient(this.supabaseUrl, this.supabaseKey);
      const { data: { user } } = await supabase.auth.getUser(userToken);
      
      if (!user) {
        throw new Error('Invalid user authentication');
      }
      
      // Send email via SMTP MCP server
      const response = await fetch(`${this.smtpApiUrl}/api/user/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify(emailData)
      });
      
      if (!response.ok) {
        throw new Error(`Email sending failed: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Email sending error:', error);
      throw error;
    }
  }
  
  async getUserEmailAnalytics(userToken: string, dateRange?: { from: string; to: string }) {
    const response = await fetch(`${this.smtpApiUrl}/api/user/analytics`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });
    
    return await response.json();
  }
}
```

### MCP Tool with Authentication

```json
{
  "name": "send-authenticated-email",
  "description": "Send email using authenticated user's SMTP configuration",
  "inputSchema": {
    "type": "object",
    "properties": {
      "userToken": {
        "type": "string",
        "description": "JWT token from Supabase Auth"
      },
      "to": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "email": { "type": "string" },
            "name": { "type": "string" }
          }
        }
      },
      "subject": { "type": "string" },
      "body": { "type": "string" },
      "smtpConfigId": {
        "type": "string",
        "description": "Optional: specific SMTP config ID (uses default if not provided)"
      }
    },
    "required": ["userToken", "to", "subject", "body"]
  }
}
```

## 📡 API Endpoints with Authentication

### User Authentication Required

```bash
# Get user's SMTP configurations
GET /api/user/smtp-configs
Authorization: Bearer <supabase-jwt-token>

# Create user SMTP configuration
POST /api/user/smtp-configs
Authorization: Bearer <supabase-jwt-token>
{
  "name": "My Gmail",
  "host": "smtp.gmail.com",
  "port": 587,
  "secure": false,
  "username": "user@gmail.com",
  "password": "app-password",
  "is_default": true
}

# Send email using user's SMTP config
POST /api/user/email/send
Authorization: Bearer <supabase-jwt-token>
{
  "to": [{"email": "recipient@example.com", "name": "John Doe"}],
  "subject": "Test Email",
  "body": "<h1>Hello from authenticated user!</h1>",
  "smtpConfigId": "optional-config-id"
}

# Get user's email analytics
GET /api/user/analytics?from=2025-01-01&to=2025-01-31
Authorization: Bearer <supabase-jwt-token>

# Get user's sent emails
GET /api/user/emails?page=1&limit=50
Authorization: Bearer <supabase-jwt-token>
```

### Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Agent / Web App                      │
│               (with Supabase Auth)                         │
└─────────────────┬───────────────────────────────────────────┘
                  │ JWT Token
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                 SMTP MCP Server                            │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐│
│  │    Auth     │  │   Email      │  │     Tracking        ││
│  │ Middleware  │  │   Service    │  │   & Analytics       ││
│  └─────────────┘  └──────────────┘  └─────────────────────┘│
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                    Supabase                                │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐│
│  │    Auth     │  │  PostgreSQL  │  │    Row Level        ││
│  │   Users     │  │   Database   │  │    Security         ││
│  └─────────────┘  └──────────────┘  └─────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## 🧪 Testing the Complete Setup

Let's test the Docker deployment:

> **📋 Complete Test Commands**: For a comprehensive list of all curl commands and test scenarios, see **[Test_Commands.md](./Test_Commands.md)** which includes:
> - ✅ Server health checks
> - ✅ SMTP configuration management  
> - ✅ Template CRUD operations
> - ✅ Email sending with CC/BCC
> - ✅ Template-based emails with variable substitution
> - ✅ PowerShell formatting commands
> - ✅ JSON file examples for complex requests

  "host": "smtp.example.com",
  "port": 587,
  "secure": false,
  "auth": {
    "user": "username",
    "pass": "password"
  },
  "isDefault": true
}
```

### Email Template Object
```json
{
  "id": "welcome-email",
  "name": "Welcome Email Template",
  "subject": "Welcome {{userName}}!",
  "body": "<h1>Welcome {{userName}}!</h1><p>Thanks for joining {{companyName}}.</p>",
  "variables": ["userName", "companyName"]
}
```

### Template Features
- **Variable Substitution**: Use `{{variableName}}` syntax in subject and body
- **HTML Support**: Full HTML formatting in email templates
- **Template Management**: Complete CRUD operations via API
- **Dual Endpoints**: Both `/api/templates/*` and `/api/*-email-template/*` endpoints
- **Default Templates**: Pre-loaded business outreach, newsletter, and default templates

### Template Usage Examples

**Create Template with Variables:**
```bash
curl -X POST "http://localhost:3008/api/add-email-template" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Welcome Email",
    "subject": "Welcome {{name}} to {{company}}!",
    "body": "<h1>Hello {{name}}!</h1><p>Welcome to {{company}}. Your role: {{role}}</p>",
    "isDefault": false
  }'
```

**Send Email Using Template:**
```bash
curl -X POST "http://localhost:3008/api/send-email" \
  -H "Content-Type: application/json" \
  -d '{
    "to": [{"email": "user@example.com", "name": "John Doe"}],
    "templateId": "welcome-email",
    "templateData": {
      "name": "John",
      "company": "TechCorp", 
      "role": "Developer"
    },
    "cc": [{"email": "manager@example.com"}],
    "bcc": [{"email": "hr@example.com"}]
  }'
```

## 📚 API Reference

### MCP Tools

| Tool Name | Description | Required Parameters |
|-----------|-------------|-------------------|
| `send-email` | Send single email | `to`, `subject`, `body` |
| `send-bulk-emails` | Send bulk emails | `recipients`, `subject`, `body` |
| `get-smtp-configs` | List SMTP configurations | None |
| `add-smtp-config` | Add SMTP configuration | `id`, `name`, `host`, `port`, `auth` |
| `update-smtp-config` | Update SMTP configuration | `id` + fields to update |
| `delete-smtp-config` | Delete SMTP configuration | `id` |
| `get-email-templates` | List email templates | None |
| `add-email-template` | Add email template | `id`, `name`, `subject`, `body` |
| `update-email-template` | Update email template | `id` + fields to update |
| `delete-email-template` | Delete email template | `id` |
| `get-email-logs` | Retrieve email logs | Optional: `limit`, `offset` |

### HTTP Endpoints

All HTTP endpoints follow the pattern: `POST /api/{tool-name}`

**Core Email Endpoints:**
- `POST /api/send-email` - Send single email
- `POST /api/send-bulk-emails` - Send bulk emails
- `GET /api/list-tools` - List available tools

**SMTP Configuration Endpoints:**
- `GET /api/smtp-configs` - List SMTP configurations  
- `POST /api/smtp-configs` - Add SMTP configuration
- `PUT /api/smtp-configs/{id}` - Update SMTP configuration
- `DELETE /api/smtp-configs/{id}` - Delete SMTP configuration

**Template Management Endpoints:**
- `GET /api/templates` - List email templates
- `POST /api/templates` - Add email template
- `PUT /api/templates/{id}` - Update email template
- `DELETE /api/templates/{id}` - Delete email template

**Template Alias Endpoints (Alternative URLs):**
- `GET /api/get-email-templates` - List email templates (alias)
- `POST /api/add-email-template` - Add email template (alias)
- `PUT /api/update-email-template/{id}` - Update email template (alias)
- `DELETE /api/delete-email-template/{id}` - Delete email template (alias)

**System Endpoints:**
- `GET /api/health` - Server health check
- `GET /api/endpoints` - List all available endpoints

## 🔒 Security Best Practices

1. **Environment Variables**: Store sensitive SMTP credentials in environment variables
2. **App Passwords**: Use application-specific passwords for Gmail and other providers
3. **Network Security**: Run behind a reverse proxy in production
4. **Rate Limiting**: Built-in rate limiting helps prevent abuse
5. **Logging**: Monitor email logs for suspicious activity

## 🌟 Common SMTP Providers

### Gmail
```json
{
  "host": "smtp.gmail.com",
  "port": 587,
  "secure": false,
  "auth": {
    "user": "your-email@gmail.com",
    "pass": "your-app-password"
  }
}
```

### Outlook/Hotmail
```json
{
  "host": "smtp-mail.outlook.com",
  "port": 587,
  "secure": false,
  "auth": {
    "user": "your-email@outlook.com",
    "pass": "your-password"
  }
}
```

### SendGrid
```json
{
  "host": "smtp.sendgrid.net",
  "port": 587,
  "secure": false,
  "auth": {
    "user": "apikey",
    "pass": "your-sendgrid-api-key"
  }
}
```

## 🛠️ Development

### Build and Watch
```bash
npm run watch
```

### Development Mode
```bash
npm run dev
```

### Project Structure
```
mcp-server-smtp/
├── src/
│   ├── index.ts           # Main server entry point
│   ├── tools.ts           # MCP tool definitions
│   ├── requestHandler.ts  # Request handling logic
│   ├── emailService.ts    # Email sending functionality
│   └── config.ts          # Configuration management
├── config/
│   └── default.json       # Default configuration
├── package.json
├── tsconfig.json
└── Dockerfile
```

## 🐳 Docker Support

### Docker Compose (Recommended for Production)
```bash
# Start with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the service
docker-compose down
```

### Manual Docker Commands
```bash
# Build the image
npm run docker:build

# Run the container
npm run docker:run
```

### Development with Docker
```bash
# For development with auto-reload
docker-compose -f docker-compose.dev.yml up
```

## 🔧 Troubleshooting

### Common Issues

1. **Authentication Errors**: Ensure you're using app-specific passwords for Gmail
2. **Port Issues**: Make sure the SMTP port is not blocked by your firewall
3. **SSL/TLS Issues**: Verify the `secure` setting matches your SMTP provider's requirements
4. **Rate Limiting**: If emails are being rejected, check your provider's rate limits

### Logs

Server logs are stored in:
- **Linux/macOS**: `/tmp/smtp-mcp-server-logs/smtp-mcp-server.log`
- **Windows**: `%TEMP%/smtp-mcp-server-logs/smtp-mcp-server.log`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Commit your changes: `git commit -am 'Add new feature'`
5. Push to the branch: `git push origin feature-name`
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

- **Issues**: Report bugs or request features on [GitHub Issues](https://github.com/yourusername/smtp-server-kkagain/issues)
- **Documentation**: Refer to this README and inline code documentation
- **MCP Protocol**: Learn more at [Model Context Protocol Documentation](https://modelcontextprotocol.io)

## 🔗 Related Projects

- [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Nodemailer](https://nodemailer.com/)
- [Claude Desktop](https://claude.ai/desktop)

---

**Made with ❤️ for the AI and developer community**
