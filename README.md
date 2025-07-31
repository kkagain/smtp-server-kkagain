# SMTP MCP Server

A powerful **Model Context Protocol (MCP) server** that provides SMTP email functionality for AI agents and applications. This server enables any MCP-compatible client to send emails, manage SMTP configurations, handle email templates, and track email logs through a standardized interface.

## 🚀 Features

### Core Email Functionality
- **Send Individual Emails**: Send emails with support for HTML content, attachments, and multiple recipients
- **Bulk Email Support**: Send emails in batches with rate limiting and delay controls
- **Multiple Recipients**: Support for TO, CC, and BCC recipients
- **HTML & Plain Text**: Full support for HTML email content with fallback to plain text

### Configuration Management
- **Multiple SMTP Servers**: Configure and manage multiple SMTP server configurations
- **Dynamic Configuration**: Add, update, and delete SMTP configurations at runtime
- **Secure Storage**: SMTP credentials stored securely in local configuration files

### Email Templates
- **Template Management**: Create, update, and delete reusable email templates
- **Variable Substitution**: Support for dynamic content using `{{variable}}` syntax
- **Template Library**: Maintain a library of commonly used email templates

### Monitoring & Logging
- **Email Logs**: Track all sent emails with timestamps, recipients, and status
- **Error Handling**: Comprehensive error logging and reporting
- **Rate Limiting**: Built-in rate limiting to prevent spam and server overload

### Dual Interface
- **MCP Protocol**: Full MCP server implementation for AI agents
- **HTTP API**: RESTful HTTP API for direct integration with web applications
- **CORS Support**: Cross-origin requests enabled for web applications

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

### Basic Usage Examples

#### Using HTTP API

**1. Add SMTP Configuration**
```bash
curl -X POST http://localhost:3007/api/add-smtp-config \
  -H "Content-Type: application/json" \
  -d '{
    "id": "gmail",
    "name": "Gmail SMTP",
    "host": "smtp.gmail.com",
    "port": 587,
    "secure": false,
    "auth": {
      "user": "your-email@gmail.com",
      "pass": "your-app-password"
    }
  }'
```

**2. Send Email**
```bash
curl -X POST http://localhost:3007/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": [{"email": "recipient@example.com", "name": "John Doe"}],
    "subject": "Hello from SMTP MCP Server",
    "body": "<h1>Hello!</h1><p>This is a test email.</p>",
    "smtpConfigId": "gmail"
  }'
```

#### Using as MCP Server

Connect your MCP-compatible client (like Claude Desktop) to use the server with tools like:
- `send-email`
- `send-bulk-emails`
- `get-smtp-configs`
- `add-smtp-config`
- `get-email-templates`
- `add-email-template`

## 🔧 Configuration

### SMTP Configuration Object
```json
{
  "id": "unique-identifier",
  "name": "Human-readable name",
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

Examples:
- `POST /api/send-email`
- `POST /api/get-smtp-configs`
- `GET /api/list-tools` (to see available tools)

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
