# Dynamic SMTP Configuration - Application Integration

## 🎯 **NEW FEATURE: Dynamic SMTP Configuration**

Your SMTP server now supports **dynamic SMTP credentials** per request! This means your applications can send their own SMTP settings with each email request, making the server truly multi-tenant.

## 🚀 **How It Works**

```
Your App  →  HTTP Request + SMTP Credentials  →  SMTP Server  →  Email Provider
```

The SMTP server will use the credentials you provide in each request, rather than requiring pre-configured credentials.

## 📧 **Updated Email Service Class**

```javascript
// Enhanced emailService.js with dynamic SMTP support
class EmailService {
  constructor(baseUrl, apiKey, defaultSmtpConfig = null) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.defaultSmtpConfig = defaultSmtpConfig; // Optional default SMTP config
    this.headers = {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    };
  }

  // Send email with your own SMTP credentials
  async sendEmailWithCustomSMTP(to, subject, text, html, smtpConfig) {
    const response = await fetch(`${this.baseUrl}/api/email/send`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        to: Array.isArray(to) ? to : [typeof to === 'string' ? { email: to } : to],
        subject,
        body: html || text,
        smtpConfig: {
          host: smtpConfig.host,
          port: smtpConfig.port || 587,
          secure: smtpConfig.secure || false,
          user: smtpConfig.user,
          pass: smtpConfig.pass
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  // Send template email with your own SMTP credentials
  async sendTemplateEmailWithCustomSMTP(templateId, to, variables, smtpConfig) {
    const response = await fetch(`${this.baseUrl}/api/email/send-template`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        templateId,
        to,
        variables,
        smtpConfig: {
          host: smtpConfig.host,
          port: smtpConfig.port || 587,
          secure: smtpConfig.secure || false,
          user: smtpConfig.user,
          pass: smtpConfig.pass
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  // Convenience method - uses default SMTP if configured
  async sendEmail(to, subject, text, html = null) {
    if (!this.defaultSmtpConfig) {
      throw new Error('No SMTP configuration provided. Use sendEmailWithCustomSMTP() or set defaultSmtpConfig.');
    }
    
    return await this.sendEmailWithCustomSMTP(to, subject, text, html, this.defaultSmtpConfig);
  }

  // Convenience method for templates
  async sendTemplateEmail(templateId, to, variables) {
    if (!this.defaultSmtpConfig) {
      throw new Error('No SMTP configuration provided. Use sendTemplateEmailWithCustomSMTP() or set defaultSmtpConfig.');
    }
    
    return await this.sendTemplateEmailWithCustomSMTP(templateId, to, variables, this.defaultSmtpConfig);
  }
}

module.exports = EmailService;
```

## 🔧 **Your App Configuration**

```javascript
// .env file in your application
SMTP_SERVER_URL=https://194.164.151.51:3008
SMTP_SERVER_API_KEY=your-api-key

# Your own SMTP credentials (Gmail example)
MY_SMTP_HOST=smtp.gmail.com
MY_SMTP_USER=your-email@gmail.com
MY_SMTP_PASS=your-gmail-app-password
MY_SMTP_PORT=587
MY_SMTP_SECURE=false
```

## 🚀 **Complete App Example**

```javascript
// app.js - Your application
require('dotenv').config();
const express = require('express');
const EmailService = require('./emailService');

const app = express();
app.use(express.json());

// Initialize email service with your SMTP credentials
const emailService = new EmailService(
  process.env.SMTP_SERVER_URL,
  process.env.SMTP_SERVER_API_KEY,
  {
    host: process.env.MY_SMTP_HOST,
    port: parseInt(process.env.MY_SMTP_PORT),
    secure: process.env.MY_SMTP_SECURE === 'true',
    user: process.env.MY_SMTP_USER,
    pass: process.env.MY_SMTP_PASS
  }
);

// Simple email endpoint
app.post('/send-email', async (req, res) => {
  const { to, subject, message } = req.body;
  
  try {
    const result = await emailService.sendEmail(
      to,
      subject,
      message,
      `<p>${message}</p>`
    );
    
    console.log('✅ Email sent successfully:', result);
    res.json({ 
      success: true, 
      messageId: result.messageId,
      message: 'Email sent successfully!' 
    });
  } catch (error) {
    console.error('❌ Email failed:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// User registration with welcome email
app.post('/register', async (req, res) => {
  const { email, name, company } = req.body;
  
  try {
    // Create user account (your logic)
    const user = await createUser(req.body);
    
    // Send welcome email using your own SMTP credentials
    const result = await emailService.sendEmail(
      email,
      `Welcome to ${company || 'Our Platform'}, ${name}!`,
      `Hi ${name},\n\nWelcome to our platform! We're excited to have you on board.\n\nBest regards,\nThe Team`,
      `
      <h1>Welcome ${name}!</h1>
      <p>Welcome to <strong>${company || 'Our Platform'}</strong>! We're excited to have you on board.</p>
      <p><a href="https://yourapp.com/login" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Get Started</a></p>
      <p>Best regards,<br>The Team</p>
      `
    );
    
    console.log('✅ Welcome email sent:', result);
    res.json({ 
      success: true, 
      user: { id: user.id, email: user.email },
      emailSent: true 
    });
  } catch (error) {
    console.error('❌ Registration failed:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Multiple SMTP configurations example
app.post('/send-marketing-email', async (req, res) => {
  const { to, subject, message } = req.body;
  
  // Use different SMTP for marketing emails
  const marketingSmtpConfig = {
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY
  };
  
  try {
    const result = await emailService.sendEmailWithCustomSMTP(
      to,
      subject,
      message,
      `<div style="font-family: Arial, sans-serif;">${message}</div>`,
      marketingSmtpConfig
    );
    
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 App running on port ${PORT}`);
  console.log(`📧 SMTP Server: ${process.env.SMTP_SERVER_URL}`);
  console.log(`✉️  Using SMTP: ${process.env.MY_SMTP_HOST}`);
});
```

## 🧪 **Testing Your Setup**

```bash
# Test simple email
curl -X POST http://localhost:3000/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test from My App",
    "message": "This email uses my own SMTP credentials!"
  }'

# Test user registration
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "name": "John Doe",
    "company": "ACME Corp"
  }'
```

## 🔒 **Multiple SMTP Providers Example**

```javascript
// Support multiple email providers in your app
class MultiProviderEmailService {
  constructor(smtpServerUrl, apiKey) {
    this.smtpServerUrl = smtpServerUrl;
    this.apiKey = apiKey;
    this.headers = {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    };
    
    // Define your SMTP providers
    this.providers = {
      gmail: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
      },
      sendgrid: {
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      },
      mailgun: {
        host: 'smtp.mailgun.org',
        port: 587,
        secure: false,
        user: process.env.MAILGUN_USER,
        pass: process.env.MAILGUN_PASS
      }
    };
  }
  
  async sendWithProvider(provider, to, subject, text, html) {
    const smtpConfig = this.providers[provider];
    if (!smtpConfig) {
      throw new Error(`Unknown provider: ${provider}`);
    }
    
    const response = await fetch(`${this.smtpServerUrl}/api/email/send`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        to: Array.isArray(to) ? to : [{ email: to }],
        subject,
        body: html || text,
        smtpConfig
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  // Use Gmail for transactional emails
  async sendTransactional(to, subject, text, html) {
    return await this.sendWithProvider('gmail', to, subject, text, html);
  }
  
  // Use SendGrid for marketing emails
  async sendMarketing(to, subject, text, html) {
    return await this.sendWithProvider('sendgrid', to, subject, text, html);
  }
  
  // Use Mailgun for notifications
  async sendNotification(to, subject, text, html) {
    return await this.sendWithProvider('mailgun', to, subject, text, html);
  }
}
```

## ✅ **Key Benefits**

- ✅ **Use your own SMTP credentials** - no need to configure server
- ✅ **Multiple SMTP providers** - use different providers for different email types
- ✅ **Per-request configuration** - different apps can use different SMTP settings
- ✅ **Fallback support** - server can still use default config if needed
- ✅ **Secure** - credentials sent with each request, not stored on server
- ✅ **Flexible** - switch providers without server changes

## 🎯 **Perfect For**

- **Multi-tenant applications** - each tenant uses their own SMTP
- **Different email types** - transactional vs marketing emails
- **Development vs production** - different SMTP for different environments
- **Backup providers** - failover to different SMTP if one fails

Your SMTP server is now a **true email relay service** that works with any SMTP provider! 🚀
