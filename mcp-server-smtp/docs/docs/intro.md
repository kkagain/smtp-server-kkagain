---
sidebar_position: 1
---

# Universal SMTP MCP Server

Welcome to the **Universal SMTP MCP Server** - a powerful and flexible email sending solution designed specifically for AI agents and applications. This server provides both Model Context Protocol (MCP) and REST API interfaces for seamless email integration.

## 🚀 Quick Start

Get your SMTP server running in minutes:

```bash
# Clone the repository
git clone https://github.com/your-username/smtp-mcp-server.git
cd smtp-mcp-server

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your SMTP settings

# Start the server
npm start
```

Your server will be available at:
- **API Server**: http://localhost:3007
- **API Documentation**: http://localhost:3007/docs
- **Health Check**: http://localhost:3007/api/health

## ✨ Key Features

### 🎯 Universal Compatibility
- Works with any SMTP provider (Gmail, Outlook, SendGrid, Mailgun, etc.)
- No vendor lock-in - switch providers anytime
- Supports both authenticated and open relay configurations

### 🤖 AI Agent Ready
- **Model Context Protocol (MCP)** support for AI agent integration
- **RESTful API** for direct HTTP calls
- **Bulk email** capabilities with rate limiting
- **Template system** for dynamic content generation

### 🔧 Developer Friendly
- **Swagger/OpenAPI** documentation
- **TypeScript** for type safety
- **Docker** support for easy deployment
- **Health monitoring** endpoints

### 🔒 Production Ready
- **Rate limiting** to prevent abuse
- **Comprehensive logging** for debugging
- **Error handling** with detailed responses
- **Security** features and validation

## 🏗️ Architecture

The SMTP MCP Server operates in multiple modes:

### Universal Mode (Default)
Perfect for development and simple deployments:
- No authentication required
- SQLite database for local storage
- Single SMTP configuration
- Immediate setup and testing

### Multi-User Mode
Enterprise-ready with user isolation:
- Supabase integration for user management
- Per-user SMTP configurations
- API key authentication
- Scalable for multiple applications

## 📚 What's Next?

1. **[Getting Started](./getting-started.md)** - Complete setup guide
2. **[API Reference](http://localhost:3007/docs)** - Interactive API documentation
3. **[Docker Deployment](./deployment/docker.md)** - Containerized deployment
4. **[VPS Setup](./deployment/vps.md)** - Production server deployment
5. **[AI Agent Integration](./integration/ai-agents.md)** - Connect with AI systems

## 🤝 Community & Support

- **GitHub**: [Issues & Discussions](https://github.com/your-username/smtp-mcp-server)
- **Documentation**: This comprehensive guide
- **API Docs**: Interactive Swagger documentation

---

Ready to send your first email? Let's [get started](./getting-started.md)!
