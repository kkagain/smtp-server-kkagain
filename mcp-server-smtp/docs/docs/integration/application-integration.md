# Application Integration Guide - SMTP MCP Server

## Overview
This guide shows how to integrate your VPS-hosted SMTP server into any application for sending emails and using templates.

## 🔌 Integration Architecture

```
Your Application  →  HTTP API Calls  →  SMTP MCP Server (VPS)  →  Email Provider (Gmail/SendGrid)
```

Your SMTP server acts as a **centralized email service** that your applications can use via HTTP API calls.

## 🚀 Quick Integration Examples

### 1. Node.js/JavaScript Integration

Create an email service class in your app:

```javascript
// emailService.js
class EmailService {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl; // Your VPS SMTP server URL
    this.apiKey = apiKey;
    this.headers = {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    };
  }

  // Send simple email
  async sendEmail(to, subject, text, html = null, options = {}) {
    const response = await fetch(`${this.baseUrl}/api/email/send`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        to,
        subject,
        text,
        html,
        ...options // cc, bcc, attachments, etc.
      })
    });

    if (!response.ok) {
      throw new Error(`Email send failed: ${response.statusText}`);
    }

    return await response.json();
  }

  // Send email using template
  async sendTemplateEmail(templateId, to, variables, options = {}) {
    const response = await fetch(`${this.baseUrl}/api/email/send-template`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        templateId,
        to,
        variables,
        ...options
      })
    });

    if (!response.ok) {
      throw new Error(`Template email send failed: ${response.statusText}`);
    }

    return await response.json();
  }

  // Send bulk emails
  async sendBulkEmails(emails) {
    const response = await fetch(`${this.baseUrl}/api/email/send-bulk`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ emails })
    });

    if (!response.ok) {
      throw new Error(`Bulk email send failed: ${response.statusText}`);
    }

    return await response.json();
  }

  // Template management methods
  async createTemplate(name, subject, html, text) {
    const response = await fetch(`${this.baseUrl}/api/templates`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ name, subject, html, text })
    });

    if (!response.ok) {
      throw new Error(`Template creation failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async getTemplates() {
    const response = await fetch(`${this.baseUrl}/api/templates`, {
      method: 'GET',
      headers: { 'X-API-Key': this.apiKey }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch templates: ${response.statusText}`);
    }

    return await response.json();
  }

  async getTemplate(id) {
    const response = await fetch(`${this.baseUrl}/api/templates/${id}`, {
      method: 'GET',
      headers: { 'X-API-Key': this.apiKey }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch template: ${response.statusText}`);
    }

    return await response.json();
  }
}

// Usage in your app
const emailService = new EmailService('https://your-domain.com', 'your-api-key');

// Export for use in other modules
module.exports = EmailService;
```

### 2. Usage Examples in Your App

```javascript
// In your application routes/controllers
const EmailService = require('./emailService');
const emailService = new EmailService('https://your-domain.com', 'your-api-key');

// Example: User registration
app.post('/register', async (req, res) => {
  const { email, name } = req.body;
  
  try {
    // Create user account
    const user = await createUser(req.body);
    
    // Send welcome email using template
    await emailService.sendTemplateEmail(
      1, // welcome template ID
      email,
      { 
        name: name,
        loginUrl: 'https://yourapp.com/login',
        company: 'Your Company'
      }
    );
    
    res.json({ success: true, message: 'User created and welcome email sent' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Example: Password reset
app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  
  try {
    const resetToken = generateResetToken();
    await saveResetToken(email, resetToken);
    
    // Send password reset email
    await emailService.sendTemplateEmail(
      2, // password reset template ID
      email,
      {
        resetUrl: `https://yourapp.com/reset-password?token=${resetToken}`,
        expiry: '24 hours'
      }
    );
    
    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send reset email' });
  }
});

// Example: Bulk notification
app.post('/send-newsletter', async (req, res) => {
  try {
    const subscribers = await getActiveSubscribers();
    
    const emails = subscribers.map(subscriber => ({
      to: subscriber.email,
      templateId: 3, // newsletter template
      variables: {
        firstName: subscriber.firstName,
        unsubscribeUrl: `https://yourapp.com/unsubscribe?token=${subscriber.token}`
      }
    }));
    
    await emailService.sendBulkEmails(emails);
    res.json({ message: `Newsletter sent to ${emails.length} subscribers` });
  } catch (error) {
    res.status(500).json({ error: 'Newsletter send failed' });
  }
});
```

### 3. Python Integration

```python
# email_service.py
import requests
import json

class EmailService:
    def __init__(self, base_url, api_key):
        self.base_url = base_url
        self.api_key = api_key
        self.headers = {
            'Content-Type': 'application/json',
            'X-API-Key': api_key
        }
    
    def send_email(self, to, subject, text, html=None, **options):
        """Send simple email"""
        payload = {
            'to': to,
            'subject': subject,
            'text': text,
            **options
        }
        if html:
            payload['html'] = html
            
        response = requests.post(
            f"{self.base_url}/api/email/send",
            headers=self.headers,
            json=payload
        )
        response.raise_for_status()
        return response.json()
    
    def send_template_email(self, template_id, to, variables, **options):
        """Send email using template"""
        payload = {
            'templateId': template_id,
            'to': to,
            'variables': variables,
            **options
        }
        
        response = requests.post(
            f"{self.base_url}/api/email/send-template",
            headers=self.headers,
            json=payload
        )
        response.raise_for_status()
        return response.json()
    
    def create_template(self, name, subject, html, text):
        """Create email template"""
        payload = {
            'name': name,
            'subject': subject,
            'html': html,
            'text': text
        }
        
        response = requests.post(
            f"{self.base_url}/api/templates",
            headers=self.headers,
            json=payload
        )
        response.raise_for_status()
        return response.json()
    
    def get_templates(self):
        """Get all templates"""
        response = requests.get(
            f"{self.base_url}/api/templates",
            headers={'X-API-Key': self.api_key}
        )
        response.raise_for_status()
        return response.json()

# Usage in Flask app
from flask import Flask, request, jsonify
from email_service import EmailService

app = Flask(__name__)
email_service = EmailService('https://your-domain.com', 'your-api-key')

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data['email']
    name = data['name']
    
    try:
        # Create user
        user = create_user(data)
        
        # Send welcome email
        email_service.send_template_email(
            template_id=1,
            to=email,
            variables={
                'name': name,
                'loginUrl': 'https://yourapp.com/login'
            }
        )
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
```

### 4. PHP Integration

```php
<?php
// EmailService.php
class EmailService {
    private $baseUrl;
    private $apiKey;
    private $headers;
    
    public function __construct($baseUrl, $apiKey) {
        $this->baseUrl = $baseUrl;
        $this->apiKey = $apiKey;
        $this->headers = [
            'Content-Type: application/json',
            'X-API-Key: ' . $apiKey
        ];
    }
    
    public function sendEmail($to, $subject, $text, $html = null, $options = []) {
        $data = array_merge([
            'to' => $to,
            'subject' => $subject,
            'text' => $text
        ], $options);
        
        if ($html) {
            $data['html'] = $html;
        }
        
        return $this->makeRequest('/api/email/send', $data);
    }
    
    public function sendTemplateEmail($templateId, $to, $variables, $options = []) {
        $data = array_merge([
            'templateId' => $templateId,
            'to' => $to,
            'variables' => $variables
        ], $options);
        
        return $this->makeRequest('/api/email/send-template', $data);
    }
    
    public function createTemplate($name, $subject, $html, $text) {
        $data = [
            'name' => $name,
            'subject' => $subject,
            'html' => $html,
            'text' => $text
        ];
        
        return $this->makeRequest('/api/templates', $data);
    }
    
    public function getTemplates() {
        return $this->makeRequest('/api/templates', null, 'GET');
    }
    
    private function makeRequest($endpoint, $data = null, $method = 'POST') {
        $ch = curl_init();
        
        curl_setopt($ch, CURLOPT_URL, $this->baseUrl . $endpoint);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $this->headers);
        
        if ($method === 'POST' && $data) {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode >= 400) {
            throw new Exception("API request failed with status $httpCode");
        }
        
        return json_decode($response, true);
    }
}

// Usage in your PHP app
$emailService = new EmailService('https://your-domain.com', 'your-api-key');

// Send welcome email
try {
    $result = $emailService->sendTemplateEmail(
        1, // template ID
        'user@example.com',
        [
            'name' => 'John Doe',
            'loginUrl' => 'https://yourapp.com/login'
        ]
    );
    echo "Email sent successfully!";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
```

## 🔧 Environment Configuration for Your Apps

### 1. Environment Variables in Your App

```bash
# In your app's .env file
SMTP_SERVER_URL=https://your-domain.com
SMTP_SERVER_API_KEY=your-secure-api-key

# Optional: Template IDs for easy reference
WELCOME_EMAIL_TEMPLATE_ID=1
PASSWORD_RESET_TEMPLATE_ID=2
NEWSLETTER_TEMPLATE_ID=3
```

### 2. Configuration Class

```javascript
// config/email.js
module.exports = {
  smtpServer: {
    baseUrl: process.env.SMTP_SERVER_URL || 'http://localhost:3008',
    apiKey: process.env.SMTP_SERVER_API_KEY,
    templates: {
      welcome: process.env.WELCOME_EMAIL_TEMPLATE_ID || 1,
      passwordReset: process.env.PASSWORD_RESET_TEMPLATE_ID || 2,
      newsletter: process.env.NEWSLETTER_TEMPLATE_ID || 3
    }
  }
};
```

## 📋 Template Management Workflow

### 1. Create Templates via API

```javascript
// setup/createTemplates.js
const EmailService = require('../emailService');
const emailService = new EmailService(process.env.SMTP_SERVER_URL, process.env.SMTP_SERVER_API_KEY);

async function setupTemplates() {
  try {
    // Welcome email template
    const welcomeTemplate = await emailService.createTemplate(
      'welcome_email',
      'Welcome to {{company}}, {{name}}!',
      `
      <h1>Welcome {{name}}!</h1>
      <p>Thank you for joining {{company}}. We're excited to have you on board!</p>
      <p><a href="{{loginUrl}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Get Started</a></p>
      <p>If you have any questions, feel free to contact our support team.</p>
      <p>Best regards,<br>The {{company}} Team</p>
      `,
      'Welcome {{name}}! Thank you for joining {{company}}. Get started: {{loginUrl}}'
    );
    
    // Password reset template
    const resetTemplate = await emailService.createTemplate(
      'password_reset',
      'Reset Your Password',
      `
      <h1>Password Reset Request</h1>
      <p>You requested to reset your password. Click the button below to create a new password:</p>
      <p><a href="{{resetUrl}}" style="background: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
      <p>This link will expire in {{expiry}}.</p>
      <p>If you didn't request this, please ignore this email.</p>
      `,
      'Password reset requested. Reset your password: {{resetUrl}} (expires in {{expiry}})'
    );
    
    console.log('Templates created:', {
      welcome: welcomeTemplate.id,
      passwordReset: resetTemplate.id
    });
    
  } catch (error) {
    console.error('Template setup failed:', error);
  }
}

setupTemplates();
```

### 2. Use Templates in Your App Logic

```javascript
// services/userService.js
const EmailService = require('./emailService');
const emailConfig = require('../config/email');

const emailService = new EmailService(
  emailConfig.smtpServer.baseUrl,
  emailConfig.smtpServer.apiKey
);

class UserService {
  async registerUser(userData) {
    try {
      // Create user account
      const user = await this.createUser(userData);
      
      // Send welcome email
      await emailService.sendTemplateEmail(
        emailConfig.smtpServer.templates.welcome,
        user.email,
        {
          name: user.firstName,
          company: 'Your Company Name',
          loginUrl: `${process.env.APP_URL}/login`
        }
      );
      
      return user;
    } catch (error) {
      throw new Error(`Registration failed: ${error.message}`);
    }
  }
  
  async initiatePasswordReset(email) {
    try {
      const user = await this.findUserByEmail(email);
      if (!user) throw new Error('User not found');
      
      const resetToken = this.generateResetToken();
      await this.saveResetToken(user.id, resetToken);
      
      // Send password reset email
      await emailService.sendTemplateEmail(
        emailConfig.smtpServer.templates.passwordReset,
        email,
        {
          resetUrl: `${process.env.APP_URL}/reset-password?token=${resetToken}`,
          expiry: '24 hours'
        }
      );
      
      return { message: 'Password reset email sent' };
    } catch (error) {
      throw new Error(`Password reset failed: ${error.message}`);
    }
  }
}

module.exports = UserService;
```

## 🔒 Security Best Practices

### 1. API Key Management

```javascript
// Secure API key storage and rotation
class SecureEmailService extends EmailService {
  constructor() {
    super(
      process.env.SMTP_SERVER_URL,
      process.env.SMTP_SERVER_API_KEY
    );
    
    // Validate required environment variables
    if (!process.env.SMTP_SERVER_URL || !process.env.SMTP_SERVER_API_KEY) {
      throw new Error('SMTP server configuration missing');
    }
  }
  
  // Add retry logic
  async sendEmailWithRetry(to, subject, text, html, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.sendEmail(to, subject, text, html);
      } catch (error) {
        if (attempt === maxRetries) throw error;
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }
}
```

### 2. Rate Limiting in Your App

```javascript
// middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

const emailRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 email requests per windowMs
  message: 'Too many email requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Use in routes that send emails
app.post('/forgot-password', emailRateLimiter, async (req, res) => {
  // Password reset logic
});
```

## 📊 Monitoring and Logging

### 1. Email Tracking in Your App

```javascript
// models/EmailLog.js
const EmailLog = {
  async logEmail(type, recipient, templateId, status, messageId) {
    return await db.emailLogs.create({
      type,
      recipient,
      templateId,
      status,
      messageId,
      sentAt: new Date()
    });
  },
  
  async getEmailStats(userId, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return await db.emailLogs.findAll({
      where: {
        userId,
        sentAt: { [Op.gte]: since }
      },
      attributes: [
        'type',
        [db.sequelize.fn('COUNT', '*'), 'count'],
        [db.sequelize.fn('COUNT', db.sequelize.literal("CASE WHEN status = 'sent' THEN 1 END")), 'successful']
      ],
      group: ['type']
    });
  }
};
```

### 2. Enhanced Email Service with Logging

```javascript
class LoggedEmailService extends EmailService {
  async sendTemplateEmail(templateId, to, variables, options = {}) {
    try {
      const result = await super.sendTemplateEmail(templateId, to, variables, options);
      
      // Log successful send
      await EmailLog.logEmail('template', to, templateId, 'sent', result.messageId);
      
      return result;
    } catch (error) {
      // Log failed send
      await EmailLog.logEmail('template', to, templateId, 'failed', null);
      throw error;
    }
  }
}
```

## 🚀 Deployment Considerations

### 1. Production Environment

```bash
# Your app's production .env
SMTP_SERVER_URL=https://your-smtp-server.com
SMTP_SERVER_API_KEY=your-production-api-key
APP_URL=https://your-app.com

# Template IDs (set after creating templates)
WELCOME_EMAIL_TEMPLATE_ID=1
PASSWORD_RESET_TEMPLATE_ID=2
NEWSLETTER_TEMPLATE_ID=3
```

### 2. Docker Integration

```dockerfile
# If your app is also containerized
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000

# Environment variables will be provided by docker-compose or k8s
CMD ["npm", "start"]
```

## ✅ Complete Integration Checklist

- [ ] Set up SMTP server on VPS with domain/SSL
- [ ] Create email service class in your app
- [ ] Configure environment variables
- [ ] Create email templates via API
- [ ] Implement email sending in your app logic
- [ ] Add error handling and retry logic
- [ ] Set up rate limiting
- [ ] Add email logging/tracking
- [ ] Test all email flows
- [ ] Monitor email delivery rates

## 📝 Summary

Your integration workflow:

1. **SMTP Server** (VPS) - Centralized email service
2. **HTTP API calls** - From your app to SMTP server
3. **Templates** - Reusable email designs with variables
4. **Environment config** - Secure API key management
5. **Error handling** - Robust email delivery
6. **Monitoring** - Track email success/failure rates

This approach gives you a **scalable, centralized email system** that any of your applications can use! 🎯
