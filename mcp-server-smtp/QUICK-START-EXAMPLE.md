# Quick Start Example - Using SMTP Server in Your App

## 🚀 Simple Implementation Example

Here's a complete example showing how to use your VPS SMTP server in a Node.js app:

### 1. Install Dependencies in Your App

```bash
npm init -y
npm install express dotenv node-fetch
```

### 2. Create Environment Config

```bash
# .env file in your app
SMTP_SERVER_URL=https://your-domain.com
SMTP_SERVER_API_KEY=your-api-key

# Your own SMTP credentials (the server will use these!)
MY_SMTP_HOST=smtp.gmail.com
MY_SMTP_PORT=587
MY_SMTP_SECURE=false
MY_SMTP_USER=your-email@gmail.com
MY_SMTP_PASS=your-gmail-app-password
```

### 3. Email Service (emailService.js)

```javascript
const fetch = require('node-fetch');

class EmailService {
  constructor() {
    this.baseUrl = process.env.SMTP_SERVER_URL;
    this.apiKey = process.env.SMTP_SERVER_API_KEY;
    this.headers = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey
    };
    
    // Your own SMTP configuration
    this.mySmtpConfig = {
      host: process.env.MY_SMTP_HOST,
      port: parseInt(process.env.MY_SMTP_PORT) || 587,
      secure: process.env.MY_SMTP_SECURE === 'true',
      user: process.env.MY_SMTP_USER,
      pass: process.env.MY_SMTP_PASS
    };
  }

  async sendEmail(to, subject, text, html = null) {
    try {
      const response = await fetch(`${this.baseUrl}/api/email/send`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ 
          to: Array.isArray(to) ? to : [typeof to === 'string' ? { email: to } : to],
          subject, 
          body: html || text,
          smtpConfig: this.mySmtpConfig // Use your own SMTP credentials!
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Email sent with your SMTP:', result.messageId);
      return result;
    } catch (error) {
      console.error('❌ Email failed:', error.message);
      throw error;
    }
  }

  async sendTemplateEmail(templateId, to, variables) {
    try {
      const response = await fetch(`${this.baseUrl}/api/email/send-template`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ 
          templateId, 
          to, 
          variables,
          smtpConfig: this.mySmtpConfig // Use your own SMTP credentials!
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Template email sent with your SMTP:', result.messageId);
      return result;
    } catch (error) {
      console.error('❌ Template email failed:', error.message);
      throw error;
    }
  }
}

module.exports = EmailService;
```

### 4. Your App (app.js)

```javascript
require('dotenv').config();
const express = require('express');
const EmailService = require('./emailService');

const app = express();
const emailService = new EmailService();

app.use(express.json());

// Simple email endpoint
app.post('/send-email', async (req, res) => {
  const { to, subject, message } = req.body;
  
  try {
    const result = await emailService.sendEmail(
      to,
      subject,
      message,
      `<p>${message}</p>` // Simple HTML version
    );
    
    res.json({ 
      success: true, 
      messageId: result.messageId,
      message: 'Email sent successfully!' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Welcome email using template
app.post('/send-welcome', async (req, res) => {
  const { email, name, company } = req.body;
  
  try {
    const result = await emailService.sendTemplateEmail(
      1, // Assuming template ID 1 is your welcome template
      email,
      { 
        name: name,
        company: company || 'Our Company',
        loginUrl: 'https://yourapp.com/login'
      }
    );
    
    res.json({ 
      success: true, 
      messageId: result.messageId,
      message: 'Welcome email sent!' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Password reset example
app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  
  try {
    // Generate reset token (implement your own logic)
    const resetToken = Math.random().toString(36).substr(2, 15);
    
    // Send password reset email
    const result = await emailService.sendTemplateEmail(
      2, // Password reset template ID
      email,
      {
        resetUrl: `https://yourapp.com/reset?token=${resetToken}`,
        expiry: '24 hours'
      }
    );
    
    res.json({ 
      success: true, 
      messageId: result.messageId,
      message: 'Password reset email sent!' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`App running on port ${PORT}`);
  console.log(`SMTP Server: ${process.env.SMTP_SERVER_URL}`);
});
```

### 5. Test Your Integration

```bash
# Start your app
node app.js

# Test simple email
curl -X POST http://localhost:3000/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test from My App",
    "message": "Hello! This email was sent from my app through the SMTP server."
  }'

# Test welcome email (requires template ID 1)
curl -X POST http://localhost:3000/send-welcome \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "name": "John Doe",
    "company": "ACME Corp"
  }'

# Test password reset
curl -X POST http://localhost:3000/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

## 🎯 How It Works

```
Your App (localhost:3000)  →  HTTP Request + Your SMTP Credentials  →  SMTP Server (VPS)  →  Your Email Provider
```

1. **Your app** receives a request (user registration, password reset, etc.)
2. **Your app** calls your SMTP server via HTTP API **with your own SMTP credentials**
3. **SMTP server** uses **your credentials** to send email via **your email provider**
4. **Response** returns with success/failure and message ID

## 🔑 **Key Benefit: Use Your Own SMTP**

- ✅ **Your app** provides SMTP credentials with each request
- ✅ **SMTP server** acts as a relay using **your credentials**
- ✅ **No server configuration** needed - credentials come from your app
- ✅ **Multiple apps** can use different SMTP providers
- ✅ **Dynamic switching** between email providers

## ✅ Key Benefits

- **Centralized Email Service**: One SMTP server for all your apps
- **Template Management**: Reusable email templates with variables
- **Easy Integration**: Simple HTTP API calls
- **Scalable**: Handle high email volumes
- **Monitoring**: Track email delivery status
- **Security**: API key authentication

## 🔧 Production Setup

1. **Deploy SMTP server** on VPS with SSL
2. **Set environment variables** in your app
3. **Create email templates** via API
4. **Test email flows** thoroughly
5. **Monitor email delivery** rates
6. **Set up error alerts** for failed emails

This gives you a **professional email system** that you can use across all your applications! 🚀
