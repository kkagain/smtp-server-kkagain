# SMTP MCP Server - Test Commands

This document contains all the curl commands used to test the SMTP MCP Server functionality, including template management, email sending with CC/BCC, and server verification.

## 🚀 Server Health & Configuration

### Check Server Health
```bash
curl -X GET "http://localhost:3008/api/health"
```

### List All Available Endpoints
```bash
curl -X GET "http://localhost:3008/api/endpoints"
```

### List All Available Tools
```bash
curl -X GET "http://localhost:3008/api/list-tools"
```

## 📧 SMTP Configuration Management

### List SMTP Configurations
```bash
curl -X GET "http://localhost:3008/api/smtp-configs"
```

### Add New SMTP Configuration
```bash
curl -X POST "http://localhost:3008/api/smtp-configs" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Gmail Bot Current",
    "host": "smtp.gmail.com", 
    "port": 587,
    "secure": false,
    "auth": {
      "user": "bot.a3asolutions@gmail.com",
      "pass": "jnvh pqxj mbly nviy"
    },
    "isDefault": true
  }'
```

### Update SMTP Configuration
```bash
curl -X PUT "http://localhost:3008/api/smtp-configs/4aade8ac-56ac-4ef0-86ab-58907e8f5c64" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "bot.a3asolutions@gmail.com - Current",
    "host": "smtp.gmail.com",
    "port": 587, 
    "secure": false,
    "auth": {
      "user": "bot.a3asolutions@gmail.com",
      "pass": "jnvh pqxj mbly nviy"
    },
    "isDefault": true
  }'
```

## 📋 Template Management

### List Email Templates (Original Endpoint)
```bash
curl -X GET "http://localhost:3008/api/templates"
```

### List Email Templates (Alias Endpoint)
```bash
curl -X GET "http://localhost:3008/api/get-email-templates"
```

### Format Templates for Better Readability (PowerShell)
```powershell
curl -X GET "http://localhost:3008/api/templates" | ConvertFrom-Json | Select-Object -ExpandProperty templates | Format-Table id, name, subject
```

### Add New Email Template (Original Endpoint)
```bash
curl -X POST "http://localhost:3008/api/templates" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-template-demo",
    "name": "Demo Test Template", 
    "subject": "Test Template Demo - {{topic}}",
    "body": "<h1>Hello {{recipient_name}}!</h1><p>This is a test template created via API to demonstrate template functionality.</p><p><strong>Topic:</strong> {{topic}}</p><p>Best regards,<br>{{sender_name}}</p>",
    "isDefault": false
  }'
```

### Add New Email Template (Alias Endpoint)
```bash
curl -X POST "http://localhost:3008/api/add-email-template" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "welcome-template",
    "name": "Welcome Email Template",
    "subject": "Welcome to {{company}} - {{name}}!",
    "body": "<h1>Welcome {{name}}!</h1><p>Thank you for joining {{company}}. We are excited to have you on board!</p><p>Next steps:</p><ul><li>Complete your profile</li><li>Join our team chat</li><li>Review your onboarding checklist</li></ul><p>Best regards,<br>The {{company}} Team</p>",
    "isDefault": false
  }'
```

## 📤 Email Sending

### Basic Email Test
```bash
curl -X POST "http://localhost:3008/api/send-email" \
  -H "Content-Type: application/json" \
  -d '{
    "to": [{"email": "bot.a3asolutions@gmail.com", "name": "Test Recipient"}],
    "subject": "SMTP MCP Server Test - Working!",
    "html": "<h1>🎉 Success!</h1><p>Your SMTP MCP Server is working correctly!</p><p>Features tested:</p><ul><li>✅ Gmail SMTP connection</li><li>✅ Email sending via API</li><li>✅ HTML email support</li></ul><p><em>Sent from SMTP MCP Server</em></p>",
    "text": "Success! Your SMTP MCP Server is working correctly.",
    "smtpConfigId": "4aade8ac-56ac-4ef0-86ab-58907e8f5c64"
  }'
```

### Email with CC and BCC
```bash
curl -X POST "http://localhost:3008/api/send-email" \
  -H "Content-Type: application/json" \
  -d '{
    "to": [{"email": "bot.a3asolutions@gmail.com", "name": "Primary Recipient"}],
    "cc": [{"email": "bot.a3asolutions@gmail.com", "name": "CC Recipient"}],
    "bcc": [{"email": "bot.a3asolutions@gmail.com", "name": "BCC Recipient"}],
    "subject": "SMTP MCP Server - CC/BCC Test",
    "html": "<h1>📧 CC/BCC Test</h1><p>This email tests CC and BCC functionality:</p><ul><li>✅ Primary recipient (TO)</li><li>✅ CC recipient (visible to all)</li><li>✅ BCC recipient (hidden from others)</li></ul><p><em>All sent to the same email for testing</em></p>",
    "smtpConfigId": "4aade8ac-56ac-4ef0-86ab-58907e8f5c64"
  }'
```

### Template-Based Email with Business Outreach Template
```bash
curl -X POST "http://localhost:3008/api/send-email" \
  -H "Content-Type: application/json" \
  -d '{
    "to": [{"email": "bot.a3asolutions@gmail.com", "name": "Primary Recipient"}],
    "cc": [{"email": "karoraca@gmail.com", "name": "Kamal Arora"}],
    "bcc": [{"email": "luthraadvisors@gmail.com", "name": "Luthra Advisors"}],
    "templateId": "business-outreach",
    "templateData": {
      "name": "John Doe",
      "company": "TechCorp Solutions", 
      "sender_name": "SMTP MCP Server Bot",
      "sender_email": "bot.a3asolutions@gmail.com"
    },
    "smtpConfigId": "4aade8ac-56ac-4ef0-86ab-58907e8f5c64"
  }'
```

### Template-Based Email with Custom Template
```bash
curl -X POST "http://localhost:3008/api/send-email" \
  -H "Content-Type: application/json" \
  -d '{
    "to": [{"email": "bot.a3asolutions@gmail.com", "name": "Test Recipient"}],
    "cc": [{"email": "karoraca@gmail.com", "name": "Kamal Arora"}],
    "bcc": [{"email": "luthraadvisors@gmail.com", "name": "Luthra Advisors"}],
    "templateId": "5268bbf1-811b-4dd1-abef-52730e0908cf",
    "templateData": {
      "recipient_name": "Demo User",
      "topic": "SMTP MCP Server Template Testing",
      "sender_name": "SMTP MCP Server Test Bot"
    },
    "smtpConfigId": "4aade8ac-56ac-4ef0-86ab-58907e8f5c64"
  }'
```

## 📁 Using JSON Files for Complex Requests

### Create JSON Files for Easier Testing

**test-email.json:**
```json
{
  "to": [{"email": "bot.a3asolutions@gmail.com", "name": "Test Recipient"}],
  "subject": "SMTP MCP Server Test - Working!",
  "html": "<h1>🎉 Success!</h1><p>Your SMTP MCP Server is working correctly!</p>",
  "smtpConfigId": "4aade8ac-56ac-4ef0-86ab-58907e8f5c64"
}
```

**test-cc-bcc.json:**
```json
{
  "to": [{"email": "bot.a3asolutions@gmail.com", "name": "Primary Recipient"}],
  "cc": [{"email": "bot.a3asolutions@gmail.com", "name": "CC Recipient"}],
  "bcc": [{"email": "bot.a3asolutions@gmail.com", "name": "BCC Recipient"}],
  "subject": "SMTP MCP Server - CC/BCC Test",
  "html": "<h1>📧 CC/BCC Test</h1><p>This email tests CC and BCC functionality</p>",
  "smtpConfigId": "4aade8ac-56ac-4ef0-86ab-58907e8f5c64"
}
```

**test-template-email.json:**
```json
{
  "to": [{"email": "bot.a3asolutions@gmail.com", "name": "Primary Recipient"}],
  "cc": [{"email": "karoraca@gmail.com", "name": "Kamal Arora"}],
  "bcc": [{"email": "luthraadvisors@gmail.com", "name": "Luthra Advisors"}],
  "templateId": "business-outreach",
  "templateData": {
    "name": "John Doe",
    "company": "TechCorp Solutions",
    "sender_name": "SMTP MCP Server Bot",
    "sender_email": "bot.a3asolutions@gmail.com"
  },
  "smtpConfigId": "4aade8ac-56ac-4ef0-86ab-58907e8f5c64"
}
```

**new-template.json:**
```json
{
  "id": "test-template-demo",
  "name": "Demo Test Template",
  "subject": "Test Template Demo - {{topic}}",
  "body": "<h1>Hello {{recipient_name}}!</h1><p>This is a test template created via API.</p>",
  "isDefault": false
}
```

**update-smtp-config.json:**
```json
{
  "name": "bot.a3asolutions@gmail.com - Current",
  "host": "smtp.gmail.com",
  "port": 587,
  "secure": false,
  "auth": {
    "user": "bot.a3asolutions@gmail.com",
    "pass": "jnvh pqxj mbly nviy"
  },
  "isDefault": true
}
```

### Send Emails Using JSON Files

```bash
# Send basic email
curl -X POST "http://localhost:3008/api/send-email" \
  -H "Content-Type: application/json" \
  -d "@test-email.json"

# Send CC/BCC email  
curl -X POST "http://localhost:3008/api/send-email" \
  -H "Content-Type: application/json" \
  -d "@test-cc-bcc.json"

# Send template-based email
curl -X POST "http://localhost:3008/api/send-email" \
  -H "Content-Type: application/json" \
  -d "@test-template-email.json"

# Add new template
curl -X POST "http://localhost:3008/api/add-email-template" \
  -H "Content-Type: application/json" \
  -d "@new-template.json"

# Update SMTP configuration
curl -X PUT "http://localhost:3008/api/smtp-configs/4aade8ac-56ac-4ef0-86ab-58907e8f5c64" \
  -H "Content-Type: application/json" \
  -d "@update-smtp-config.json"
```

## 🔍 PowerShell Commands for Better Output

### Pretty Print JSON Responses
```powershell
# List templates with formatting
curl -X GET "http://localhost:3008/api/templates" | ConvertFrom-Json | ConvertTo-Json -Depth 10

# List SMTP configs with formatting  
curl -X GET "http://localhost:3008/api/smtp-configs" | ConvertFrom-Json | ConvertTo-Json -Depth 10

# Show only template IDs and names
powershell -Command "Invoke-RestMethod -Uri 'http://localhost:3008/api/templates' -Method Get"
```

## 📊 Test Results Summary

### Successful Test Messages
All the following email tests were successful and generated message IDs:

1. **Basic Email Test**: `f2130be0-9bb8-d8b4-bf36-32fd9b2f6101@gmail.com`
2. **CC/BCC Test**: `7b5afeab-99aa-8167-1764-cd1f272a4b98@gmail.com`  
3. **Business Template Test**: `617b6fe9-8828-1251-4824-4472c639af7a@gmail.com`
4. **Custom Template Test**: `07ba5908-a175-8960-7dad-5dcd796b285e@gmail.com`

### Features Verified
- ✅ Gmail SMTP connection with app password
- ✅ Basic email sending
- ✅ HTML email support
- ✅ CC functionality (karoraca@gmail.com)
- ✅ BCC functionality (luthraadvisors@gmail.com)
- ✅ Template management (CRUD operations)
- ✅ Template alias endpoints
- ✅ Template variable substitution
- ✅ SMTP configuration management
- ✅ Server health monitoring

## 🛠️ Troubleshooting Commands

### Check Server Status
```bash
# Health check
curl -X GET "http://localhost:3008/api/health"

# Check if server is running on port 3008
netstat -ano | findstr :3008

# Test basic connectivity
curl -X GET "http://localhost:3008/api/endpoints"
```

### Validate SMTP Configuration
```bash
# List current SMTP configs
curl -X GET "http://localhost:3008/api/smtp-configs"

# Test with specific config ID
curl -X POST "http://localhost:3008/api/send-email" \
  -H "Content-Type: application/json" \
  -d '{
    "to": [{"email": "your-test-email@domain.com"}],
    "subject": "Test",
    "html": "<p>Test email</p>",
    "smtpConfigId": "your-config-id"
  }'
```

### Debug Template Issues
```bash
# List all templates
curl -X GET "http://localhost:3008/api/templates"

# Test template with variables
curl -X POST "http://localhost:3008/api/send-email" \
  -H "Content-Type: application/json" \
  -d '{
    "to": [{"email": "test@domain.com"}],
    "templateId": "template-id",
    "templateData": {"variable": "value"},
    "smtpConfigId": "config-id"
  }'
```

---

**Note**: Replace `localhost:3008` with your actual server address and port if different. Ensure all JSON files are properly formatted and SMTP credentials are current before testing.
