# Langchain AI Agent Integration Guide

This comprehensive guide shows how to integrate the Universal SMTP MCP Server with Langchain-based AI agents, using Supabase for user-specific SMTP settings and authentication.

## Overview

This integration allows Langchain AI agents to:
- Authenticate users through Supabase
- Retrieve user-specific SMTP configurations from Supabase tables
- Send emails using the authenticated user's SMTP settings
- Maintain secure, isolated email operations per user

## Architecture Flow

```
Langchain AI Agent → Supabase Auth → SMTP MCP Server → User's SMTP Provider → Email Delivery
```

1. **User Authentication**: AI agent authenticates with Supabase
2. **SMTP Settings Retrieval**: Fetch user's SMTP config from Supabase
3. **Email Sending**: Use MCP server with user's authenticated settings
4. **Audit & Logging**: Track all email operations per user

## Prerequisites

- Langchain framework setup
- Supabase project with authentication enabled
- Universal SMTP MCP Server running
- User SMTP configurations stored in Supabase

## Supabase Database Schema

### 1. User SMTP Configurations Table

```sql
-- Create user_smtp_configs table
CREATE TABLE user_smtp_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    config_name VARCHAR(100) NOT NULL,
    smtp_host VARCHAR(255) NOT NULL,
    smtp_port INTEGER NOT NULL DEFAULT 587,
    smtp_secure BOOLEAN DEFAULT false,
    smtp_user VARCHAR(255) NOT NULL,
    smtp_password_encrypted TEXT NOT NULL, -- Encrypted password
    from_email VARCHAR(255) NOT NULL,
    from_name VARCHAR(255),
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_user_smtp_configs_user_id ON user_smtp_configs(user_id);
CREATE INDEX idx_user_smtp_configs_default ON user_smtp_configs(user_id, is_default) WHERE is_default = true;

-- Enable Row Level Security
ALTER TABLE user_smtp_configs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can only access their own SMTP configs" 
    ON user_smtp_configs FOR ALL 
    USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_user_smtp_configs_updated_at 
    BEFORE UPDATE ON user_smtp_configs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2. Email Audit Log Table

```sql
-- Create email_audit_log table
CREATE TABLE email_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    smtp_config_id UUID REFERENCES user_smtp_configs(id),
    recipient_emails TEXT[] NOT NULL,
    subject VARCHAR(500),
    email_type VARCHAR(50), -- 'single', 'bulk', 'template'
    template_id VARCHAR(100),
    status VARCHAR(20) NOT NULL, -- 'sent', 'failed', 'pending'
    error_message TEXT,
    message_id VARCHAR(255),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    agent_context JSONB, -- AI agent context and metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_email_audit_user_id ON email_audit_log(user_id);
CREATE INDEX idx_email_audit_status ON email_audit_log(status);
CREATE INDEX idx_email_audit_sent_at ON email_audit_log(sent_at);

-- Enable RLS
ALTER TABLE email_audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can only access their own email logs" 
    ON email_audit_log FOR ALL 
    USING (auth.uid() = user_id);
```

## Langchain Integration Implementation

### 1. Core Integration Class

```python
# smtp_langchain_integration.py
import os
import json
import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime
from supabase import create_client, Client
from langchain.tools import BaseTool
from langchain.callbacks.manager import CallbackManagerForToolRun
from pydantic import BaseModel, Field
import requests
import logging
from cryptography.fernet import Fernet

class SMTPConfig(BaseModel):
    """SMTP Configuration model"""
    id: str
    config_name: str
    smtp_host: str
    smtp_port: int
    smtp_secure: bool
    smtp_user: str
    smtp_password: str
    from_email: str
    from_name: Optional[str] = None
    is_default: bool = False

class EmailRequest(BaseModel):
    """Email request model"""
    to: List[Dict[str, str]]
    subject: str
    body: str
    from_email: Optional[str] = None
    from_name: Optional[str] = None
    cc: Optional[List[Dict[str, str]]] = None
    bcc: Optional[List[Dict[str, str]]] = None
    template_id: Optional[str] = None
    template_data: Optional[Dict] = None

class LangchainSMTPAgent:
    """Main integration class for Langchain AI agents with SMTP MCP Server"""
    
    def __init__(
        self,
        supabase_url: str,
        supabase_key: str,
        smtp_server_url: str = "http://localhost:3008",
        encryption_key: Optional[str] = None
    ):
        self.supabase: Client = create_client(supabase_url, supabase_key)
        self.smtp_server_url = smtp_server_url.rstrip('/')
        self.encryption_key = encryption_key or os.getenv('SMTP_ENCRYPTION_KEY')
        self.cipher_suite = Fernet(self.encryption_key.encode()) if self.encryption_key else None
        self.logger = logging.getLogger(__name__)
        
    async def authenticate_user(self, access_token: str) -> Optional[Dict]:
        """Authenticate user and return user info"""
        try:
            self.supabase.auth.set_session(access_token, "")
            user = self.supabase.auth.get_user(access_token)
            return user.user if user.user else None
        except Exception as e:
            self.logger.error(f"Authentication failed: {e}")
            return None
    
    async def get_user_smtp_config(
        self, 
        user_id: str, 
        config_name: Optional[str] = None,
        use_default: bool = True
    ) -> Optional[SMTPConfig]:
        """Retrieve user's SMTP configuration from Supabase"""
        try:
            query = self.supabase.table('user_smtp_configs').select('*').eq('user_id', user_id).eq('is_active', True)
            
            if config_name:
                query = query.eq('config_name', config_name)
            elif use_default:
                query = query.eq('is_default', True)
            
            result = query.execute()
            
            if result.data:
                config_data = result.data[0]
                
                # Decrypt password if encryption is enabled
                smtp_password = config_data['smtp_password_encrypted']
                if self.cipher_suite:
                    smtp_password = self.cipher_suite.decrypt(smtp_password.encode()).decode()
                
                return SMTPConfig(
                    id=config_data['id'],
                    config_name=config_data['config_name'],
                    smtp_host=config_data['smtp_host'],
                    smtp_port=config_data['smtp_port'],
                    smtp_secure=config_data['smtp_secure'],
                    smtp_user=config_data['smtp_user'],
                    smtp_password=smtp_password,
                    from_email=config_data['from_email'],
                    from_name=config_data.get('from_name'),
                    is_default=config_data['is_default']
                )
            return None
        except Exception as e:
            self.logger.error(f"Failed to retrieve SMTP config: {e}")
            return None
    
    async def send_email_via_mcp(
        self,
        user_id: str,
        email_request: EmailRequest,
        smtp_config: Optional[SMTPConfig] = None,
        agent_context: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Send email using MCP server with user's SMTP configuration"""
        try:
            # Get SMTP config if not provided
            if not smtp_config:
                smtp_config = await self.get_user_smtp_config(user_id)
                if not smtp_config:
                    raise Exception("No SMTP configuration found for user")
            
            # Prepare email payload
            payload = {
                "to": email_request.to,
                "subject": email_request.subject,
                "body": email_request.body,
                "from": {
                    "email": email_request.from_email or smtp_config.from_email,
                    "name": email_request.from_name or smtp_config.from_name
                }
            }
            
            # Add optional fields
            if email_request.cc:
                payload["cc"] = email_request.cc
            if email_request.bcc:
                payload["bcc"] = email_request.bcc
            if email_request.template_id:
                payload["templateId"] = email_request.template_id
                payload["templateData"] = email_request.template_data or {}
            
            # Add SMTP configuration
            payload["smtpConfig"] = {
                "host": smtp_config.smtp_host,
                "port": smtp_config.smtp_port,
                "secure": smtp_config.smtp_secure,
                "auth": {
                    "user": smtp_config.smtp_user,
                    "pass": smtp_config.smtp_password
                }
            }
            
            # Send email via MCP server
            response = requests.post(
                f"{self.smtp_server_url}/api/send-email",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            response.raise_for_status()
            result = response.json()
            
            # Log email audit
            await self._log_email_audit(
                user_id=user_id,
                smtp_config_id=smtp_config.id,
                email_request=email_request,
                status="sent",
                message_id=result.get('messageId'),
                agent_context=agent_context
            )
            
            return {
                "success": True,
                "message": "Email sent successfully",
                "data": result
            }
            
        except requests.exceptions.RequestException as e:
            error_msg = f"HTTP request failed: {e}"
            self.logger.error(error_msg)
            
            # Log failed email audit
            await self._log_email_audit(
                user_id=user_id,
                smtp_config_id=smtp_config.id if smtp_config else None,
                email_request=email_request,
                status="failed",
                error_message=error_msg,
                agent_context=agent_context
            )
            
            return {
                "success": False,
                "error": error_msg
            }
        except Exception as e:
            error_msg = f"Email sending failed: {e}"
            self.logger.error(error_msg)
            
            return {
                "success": False,
                "error": error_msg
            }
    
    async def _log_email_audit(
        self,
        user_id: str,
        smtp_config_id: Optional[str],
        email_request: EmailRequest,
        status: str,
        message_id: Optional[str] = None,
        error_message: Optional[str] = None,
        agent_context: Optional[Dict] = None
    ):
        """Log email sending audit to Supabase"""
        try:
            audit_data = {
                "user_id": user_id,
                "smtp_config_id": smtp_config_id,
                "recipient_emails": [recipient["email"] for recipient in email_request.to],
                "subject": email_request.subject,
                "email_type": "template" if email_request.template_id else "single",
                "template_id": email_request.template_id,
                "status": status,
                "message_id": message_id,
                "error_message": error_message,
                "agent_context": agent_context
            }
            
            self.supabase.table('email_audit_log').insert(audit_data).execute()
            
        except Exception as e:
            self.logger.error(f"Failed to log email audit: {e}")

# Langchain Tool Implementation
class SendEmailTool(BaseTool):
    """Langchain tool for sending emails via SMTP MCP Server"""
    
    name = "send_email"
    description = """Send an email using the user's SMTP configuration from Supabase.
    
    Use this tool when you need to send emails on behalf of authenticated users.
    The tool will automatically retrieve the user's SMTP settings and send the email.
    
    Args:
        user_token: User's authentication token
        to_emails: List of recipient email addresses (format: [{"email": "user@example.com", "name": "User Name"}])
        subject: Email subject line
        body: Email body content (HTML supported)
        from_name: Optional sender name (defaults to user's configured name)
        cc_emails: Optional CC recipients
        bcc_emails: Optional BCC recipients
        template_id: Optional email template ID
        template_data: Optional template variables
    """
    
    smtp_agent: LangchainSMTPAgent = Field(exclude=True)
    
    def __init__(self, smtp_agent: LangchainSMTPAgent):
        super().__init__()
        self.smtp_agent = smtp_agent
    
    def _run(
        self,
        user_token: str,
        to_emails: str,
        subject: str,
        body: str,
        from_name: Optional[str] = None,
        cc_emails: Optional[str] = None,
        bcc_emails: Optional[str] = None,
        template_id: Optional[str] = None,
        template_data: Optional[str] = None,
        run_manager: Optional[CallbackManagerForToolRun] = None,
    ) -> str:
        """Execute the email sending"""
        try:
            # Parse input parameters
            to_list = json.loads(to_emails) if isinstance(to_emails, str) else to_emails
            cc_list = json.loads(cc_emails) if cc_emails else None
            bcc_list = json.loads(bcc_emails) if bcc_emails else None
            template_vars = json.loads(template_data) if template_data else None
            
            # Authenticate user
            user = asyncio.run(self.smtp_agent.authenticate_user(user_token))
            if not user:
                return "Error: User authentication failed"
            
            # Create email request
            email_request = EmailRequest(
                to=to_list,
                subject=subject,
                body=body,
                from_name=from_name,
                cc=cc_list,
                bcc=bcc_list,
                template_id=template_id,
                template_data=template_vars
            )
            
            # Agent context for audit
            agent_context = {
                "tool_name": self.name,
                "langchain_run_id": str(run_manager.run_id) if run_manager else None,
                "timestamp": datetime.now().isoformat()
            }
            
            # Send email
            result = asyncio.run(
                self.smtp_agent.send_email_via_mcp(
                    user_id=user['id'],
                    email_request=email_request,
                    agent_context=agent_context
                )
            )
            
            if result["success"]:
                return f"Email sent successfully to {len(to_list)} recipient(s). Message ID: {result.get('data', {}).get('messageId', 'N/A')}"
            else:
                return f"Email sending failed: {result['error']}"
                
        except Exception as e:
            error_msg = f"Tool execution failed: {e}"
            if run_manager:
                run_manager.on_tool_error(error_msg)
            return error_msg
```

### 2. Langchain Agent Setup Example

```python
# langchain_smtp_agent_example.py
import os
from langchain.agents import initialize_agent, AgentType
from langchain.llms import OpenAI
from langchain.memory import ConversationBufferMemory
from langchain.schema import SystemMessage
from smtp_langchain_integration import LangchainSMTPAgent, SendEmailTool

class EmailAIAgent:
    """AI Agent with email sending capabilities"""
    
    def __init__(self):
        # Initialize SMTP agent
        self.smtp_agent = LangchainSMTPAgent(
            supabase_url=os.getenv('SUPABASE_URL'),
            supabase_key=os.getenv('SUPABASE_ANON_KEY'),
            smtp_server_url=os.getenv('SMTP_SERVER_URL', 'http://localhost:3008'),
            encryption_key=os.getenv('SMTP_ENCRYPTION_KEY')
        )
        
        # Initialize Langchain components
        self.llm = OpenAI(temperature=0.7)
        self.memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True)
        
        # Create tools
        self.tools = [
            SendEmailTool(smtp_agent=self.smtp_agent)
        ]
        
        # Initialize agent
        self.agent = initialize_agent(
            tools=self.tools,
            llm=self.llm,
            agent=AgentType.CONVERSATIONAL_REACT_DESCRIPTION,
            memory=self.memory,
            verbose=True,
            system_message=SystemMessage(content="""
            You are an AI assistant that can send emails on behalf of authenticated users.
            
            When sending emails:
            1. Always require user authentication token
            2. Validate email addresses before sending
            3. Use appropriate subject lines and professional formatting
            4. Confirm with user before sending sensitive emails
            5. Provide clear feedback about email delivery status
            
            Available email formats:
            - Plain text emails
            - HTML emails with formatting
            - Template-based emails with variables
            - Bulk emails to multiple recipients
            """)
        )
    
    def send_email(self, user_token: str, prompt: str) -> str:
        """Process email sending request through AI agent"""
        return self.agent.run(f"User token: {user_token}. Request: {prompt}")
    
    def run_conversation(self, user_token: str) -> None:
        """Interactive conversation mode"""
        print("🤖 Email AI Agent Ready! Type 'quit' to exit.")
        print("💡 I can help you send emails using your configured SMTP settings.")
        
        while True:
            user_input = input("\n👤 You: ")
            if user_input.lower() in ['quit', 'exit', 'bye']:
                print("👋 Goodbye!")
                break
            
            try:
                response = self.send_email(user_token, user_input)
                print(f"\n🤖 Assistant: {response}")
            except Exception as e:
                print(f"\n❌ Error: {e}")

# Usage example
if __name__ == "__main__":
    # Initialize the email AI agent
    email_agent = EmailAIAgent()
    
    # Example: Direct email sending
    user_token = "your_supabase_user_token_here"
    
    result = email_agent.send_email(
        user_token=user_token,
        prompt="""
        Send a welcome email to john.doe@example.com with subject "Welcome to Our Platform".
        The email should include:
        - A warm welcome message
        - Information about getting started
        - Contact information for support
        Make it professional and friendly.
        """
    )
    print(result)
    
    # Example: Interactive mode
    # email_agent.run_conversation(user_token)
```

### 3. Advanced Features Implementation

```python
# advanced_smtp_features.py
from typing import List, Dict, Any
import asyncio
from datetime import datetime, timedelta
from smtp_langchain_integration import LangchainSMTPAgent, EmailRequest

class AdvancedSMTPFeatures:
    """Advanced features for SMTP integration"""
    
    def __init__(self, smtp_agent: LangchainSMTPAgent):
        self.smtp_agent = smtp_agent
    
    async def send_bulk_emails(
        self,
        user_id: str,
        email_list: List[EmailRequest],
        rate_limit_delay: int = 1000,
        batch_size: int = 50
    ) -> Dict[str, Any]:
        """Send bulk emails with rate limiting"""
        try:
            smtp_config = await self.smtp_agent.get_user_smtp_config(user_id)
            if not smtp_config:
                return {"success": False, "error": "No SMTP configuration found"}
            
            total_emails = len(email_list)
            sent_count = 0
            failed_count = 0
            results = []
            
            # Process in batches
            for i in range(0, total_emails, batch_size):
                batch = email_list[i:i + batch_size]
                
                for email_request in batch:
                    result = await self.smtp_agent.send_email_via_mcp(
                        user_id=user_id,
                        email_request=email_request,
                        smtp_config=smtp_config,
                        agent_context={"bulk_email": True, "batch_number": i // batch_size + 1}
                    )
                    
                    results.append(result)
                    if result["success"]:
                        sent_count += 1
                    else:
                        failed_count += 1
                    
                    # Rate limiting
                    if rate_limit_delay > 0:
                        await asyncio.sleep(rate_limit_delay / 1000)
            
            return {
                "success": True,
                "total": total_emails,
                "sent": sent_count,
                "failed": failed_count,
                "results": results
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def schedule_email(
        self,
        user_id: str,
        email_request: EmailRequest,
        send_at: datetime,
        agent_context: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Schedule email for future delivery"""
        try:
            # Calculate delay
            delay_seconds = (send_at - datetime.now()).total_seconds()
            
            if delay_seconds <= 0:
                # Send immediately if time has passed
                return await self.smtp_agent.send_email_via_mcp(
                    user_id=user_id,
                    email_request=email_request,
                    agent_context={**(agent_context or {}), "scheduled": False}
                )
            
            # Schedule for future delivery
            await asyncio.sleep(delay_seconds)
            
            return await self.smtp_agent.send_email_via_mcp(
                user_id=user_id,
                email_request=email_request,
                agent_context={**(agent_context or {}), "scheduled": True, "send_at": send_at.isoformat()}
            )
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_email_analytics(
        self,
        user_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get email sending analytics for user"""
        try:
            query = self.smtp_agent.supabase.table('email_audit_log').select('*').eq('user_id', user_id)
            
            if start_date:
                query = query.gte('sent_at', start_date.isoformat())
            if end_date:
                query = query.lte('sent_at', end_date.isoformat())
            
            result = query.execute()
            
            if not result.data:
                return {"total": 0, "sent": 0, "failed": 0, "emails": []}
            
            emails = result.data
            total = len(emails)
            sent = len([e for e in emails if e['status'] == 'sent'])
            failed = len([e for e in emails if e['status'] == 'failed'])
            
            return {
                "total": total,
                "sent": sent,
                "failed": failed,
                "success_rate": (sent / total * 100) if total > 0 else 0,
                "emails": emails
            }
            
        except Exception as e:
            return {"error": str(e)}
```

## Environment Configuration

### 1. Environment Variables

```bash
# .env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# SMTP MCP Server
SMTP_SERVER_URL=http://localhost:3008

# Encryption for stored passwords
SMTP_ENCRYPTION_KEY=your_32_byte_base64_encryption_key

# Langchain Configuration
OPENAI_API_KEY=your_openai_api_key
LANGCHAIN_TRACING=true
LANGCHAIN_API_KEY=your_langchain_api_key

# Logging
LOG_LEVEL=INFO
LOG_FILE=logs/langchain_smtp.log
```

### 2. Dependencies

```txt
# requirements.txt
langchain>=0.1.0
supabase>=2.0.0
requests>=2.31.0
pydantic>=2.0.0
cryptography>=41.0.0
python-dotenv>=1.0.0
asyncio
logging
```

## Usage Examples

### 1. Basic Email Sending

```python
# Example 1: Simple email
agent = EmailAIAgent()
result = agent.send_email(
    user_token="user_token_here",
    prompt="Send a thank you email to customer@example.com for their recent purchase"
)
```

### 2. Template-based Email

```python
# Example 2: Template email
result = agent.send_email(
    user_token="user_token_here",
    prompt="""
    Send a welcome email using template 'user_onboarding' to new_user@example.com.
    Template variables:
    - name: John Doe
    - company: Acme Corp
    - login_url: https://app.example.com/login
    """
)
```

### 3. Bulk Email Campaign

```python
# Example 3: Bulk emails
result = agent.send_email(
    user_token="user_token_here",
    prompt="""
    Send a newsletter to the following recipients:
    - alice@example.com
    - bob@example.com
    - charlie@example.com
    
    Subject: "Monthly Update - December 2024"
    Include our latest product updates and company news.
    """
)
```

## Security Best Practices

### 1. Token Management

```python
class SecureTokenManager:
    """Secure token management for user authentication"""
    
    @staticmethod
    def validate_token(token: str) -> bool:
        """Validate token format and expiry"""
        # Implement token validation logic
        pass
    
    @staticmethod
    def refresh_token(token: str) -> Optional[str]:
        """Refresh expired token"""
        # Implement token refresh logic
        pass
```

### 2. Input Validation

```python
class EmailValidator:
    """Email input validation and sanitization"""
    
    @staticmethod
    def validate_email_address(email: str) -> bool:
        """Validate email address format"""
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    @staticmethod
    def sanitize_html_content(content: str) -> str:
        """Sanitize HTML content to prevent XSS"""
        # Implement HTML sanitization
        pass
```

## Deployment Configuration

### 1. Production Setup

```python
# production_config.py
import os
from smtp_langchain_integration import LangchainSMTPAgent

def create_production_agent():
    """Create production-ready SMTP agent"""
    return LangchainSMTPAgent(
        supabase_url=os.getenv('SUPABASE_URL'),
        supabase_key=os.getenv('SUPABASE_SERVICE_ROLE_KEY'),  # Use service role in production
        smtp_server_url=os.getenv('SMTP_SERVER_URL'),
        encryption_key=os.getenv('SMTP_ENCRYPTION_KEY')
    )
```

### 2. Error Handling and Monitoring

```python
# monitoring.py
import logging
from datetime import datetime
from typing import Dict, Any

class EmailMonitoring:
    """Email sending monitoring and alerting"""
    
    def __init__(self):
        self.logger = logging.getLogger('email_monitoring')
    
    def log_email_event(self, event_type: str, user_id: str, details: Dict[str, Any]):
        """Log email events for monitoring"""
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "event_type": event_type,
            "user_id": user_id,
            "details": details
        }
        self.logger.info(f"Email Event: {log_entry}")
    
    def check_rate_limits(self, user_id: str) -> bool:
        """Check if user has exceeded rate limits"""
        # Implement rate limiting logic
        pass
    
    def send_alert(self, alert_type: str, message: str):
        """Send monitoring alerts"""
        # Implement alerting logic
        pass
```

## Integration Checklist

### Pre-deployment Checklist

- [ ] **Supabase Setup**
  - [ ] Database tables created with RLS policies
  - [ ] Authentication configured
  - [ ] Service role key secured

- [ ] **SMTP MCP Server**
  - [ ] Server running and accessible
  - [ ] Health endpoints responding
  - [ ] API documentation accessible

- [ ] **Security**
  - [ ] Encryption keys generated and secured
  - [ ] Environment variables configured
  - [ ] Token validation implemented
  - [ ] Input sanitization enabled

- [ ] **Testing**
  - [ ] Unit tests for all components
  - [ ] Integration tests with Supabase
  - [ ] Email delivery tests
  - [ ] Error handling tests

- [ ] **Monitoring**
  - [ ] Logging configured
  - [ ] Error tracking enabled
  - [ ] Performance monitoring setup
  - [ ] Rate limiting implemented

## Support and Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Verify Supabase URL and keys
   - Check token expiry and format
   - Validate RLS policies

2. **Email Delivery Issues**
   - Verify SMTP configurations
   - Check network connectivity
   - Validate email addresses

3. **Performance Issues**
   - Implement connection pooling
   - Add caching for SMTP configs
   - Use bulk operations for multiple emails

### Debug Mode

```python
# Enable debug logging
import logging
logging.basicConfig(level=logging.DEBUG)

# Test connectivity
agent = LangchainSMTPAgent(...)
test_result = await agent.test_connectivity()
print(f"Connectivity test: {test_result}")
```

## Next Steps

1. **Setup Supabase Database**: Create tables and configure RLS
2. **Configure SMTP Settings**: Add user SMTP configurations
3. **Deploy Integration**: Install dependencies and configure environment
4. **Test Email Sending**: Verify end-to-end functionality
5. **Monitor and Scale**: Implement monitoring and optimize performance

For additional support and examples, refer to:
- [SMTP MCP Server API Documentation](http://localhost:3008/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Langchain Documentation](https://python.langchain.com/docs)
