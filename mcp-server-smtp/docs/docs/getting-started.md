# Getting Started

This guide will help you set up and run the Universal SMTP MCP Server in various configurations.

## Prerequisites

- **Node.js** 18.0 or higher
- **npm** or **yarn** package manager
- **SMTP server credentials** (Gmail, Outlook, SendGrid, etc.)

## Installation

### Option 1: From Source

```bash
# Clone the repository
git clone https://github.com/your-username/smtp-mcp-server.git
cd smtp-mcp-server

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env
```

### Option 2: Using Docker

```bash
# Pull the latest image
docker pull your-username/smtp-mcp-server:latest

# Run with environment file
docker run -d --name smtp-server \
  --env-file .env \
  -p 3007:3007 \
  your-username/smtp-mcp-server:latest
```

## Configuration

### Environment Variables

Edit the `.env` file with your configuration:

```bash
# Server Configuration
PORT=3007
NODE_ENV=production

# Database Configuration (SQLite by default)
DATABASE_TYPE=sqlite
SQLITE_DB_PATH=./data/smtp-server.db

# Optional: PostgreSQL/Supabase for multi-user mode
# DATABASE_URL=postgresql://user:password@localhost:5432/smtp_server
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_ANON_KEY=your-anon-key

# SMTP Configuration (Default Provider)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Security
JWT_SECRET=your-super-secret-jwt-key
API_KEY=your-optional-api-key

# Features
ENABLE_RATE_LIMITING=true
ENABLE_BULK_EMAIL=true
ENABLE_TEMPLATES=true

# Swagger Documentation
ENABLE_SWAGGER=true
SWAGGER_UI_PATH=/docs
```

### SMTP Provider Setup

#### Gmail Setup

1. Enable 2-factor authentication
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. Use the app password in `SMTP_PASS`

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
```

#### Outlook/Hotmail Setup

```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

#### SendGrid Setup

```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

## Starting the Server

### Development Mode

```bash
npm run dev
```

This starts the server with:
- Hot reloading enabled
- Verbose logging
- Development environment

### Production Mode

```bash
npm run build
npm start
```

## Verifying Installation

### Health Check

```bash
curl http://localhost:3007/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0"
}
```

### Send Test Email

```bash
curl -X POST http://localhost:3007/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": [{"email": "test@example.com", "name": "Test User"}],
    "subject": "Test Email from SMTP MCP Server",
    "body": "<h1>Hello World!</h1><p>This is a test email.</p>"
  }'
```

## Access Points

Once running, your server provides:

| Service | URL | Description |
|---------|-----|-------------|
| **API Server** | http://localhost:3007 | Main API endpoint |
| **Swagger Docs** | http://localhost:3007/docs | Interactive API documentation |
| **Health Check** | http://localhost:3007/api/health | Server status monitoring |
| **OpenAPI Spec** | http://localhost:3007/api-docs.json | Machine-readable API spec |

## Next Steps

1. **[API Reference](http://localhost:3007/docs)** - Explore all available endpoints
2. **[Docker Deployment](./deployment/docker.md)** - Deploy with Docker
3. **[VPS Setup](./deployment/vps.md)** - Production deployment guide
4. **[AI Agent Integration](./integration/ai-agents.md)** - Connect with AI systems

## Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Change port in .env file
PORT=3008
```

**SMTP Authentication Failed**
- Verify SMTP credentials
- Check if 2FA is enabled (use app passwords)
- Ensure "Less secure apps" is enabled (for some providers)

**Database Connection Issues**
- Ensure database directory exists and is writable
- For PostgreSQL, verify connection string format

### Enable Debug Logging

```bash
# In .env file
NODE_ENV=development
LOG_LEVEL=debug
```

### Check Server Logs

```bash
# View logs in real-time
tail -f /tmp/smtp-mcp-server-logs/smtp-mcp-server.log
```
