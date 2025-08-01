# Langchain SMTP Integration - Quick Reference

## 🚀 Quick Setup

```python
# 1. Install dependencies
pip install langchain supabase requests pydantic cryptography python-dotenv

# 2. Environment setup
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_key
SMTP_SERVER_URL=http://localhost:3008
SMTP_ENCRYPTION_KEY=your_encryption_key

# 3. Initialize agent
from smtp_langchain_integration import LangchainSMTPAgent, SendEmailTool

agent = LangchainSMTPAgent(
    supabase_url=os.getenv('SUPABASE_URL'),
    supabase_key=os.getenv('SUPABASE_ANON_KEY'),
    smtp_server_url=os.getenv('SMTP_SERVER_URL')
)
```

## 📊 Supabase Database Schema

```sql
-- User SMTP Configurations
CREATE TABLE user_smtp_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    smtp_host VARCHAR(255) NOT NULL,
    smtp_port INTEGER DEFAULT 587,
    smtp_user VARCHAR(255) NOT NULL,
    smtp_password_encrypted TEXT NOT NULL,
    from_email VARCHAR(255) NOT NULL,
    is_default BOOLEAN DEFAULT false
);

-- Email Audit Log
CREATE TABLE email_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    recipient_emails TEXT[],
    subject VARCHAR(500),
    status VARCHAR(20),
    sent_at TIMESTAMP DEFAULT NOW()
);
```

## 🔧 Basic Usage

```python
# Send simple email
result = await agent.send_email_via_mcp(
    user_id="user_uuid",
    email_request=EmailRequest(
        to=[{"email": "user@example.com", "name": "User"}],
        subject="Hello World",
        body="<h1>Hello!</h1><p>This is a test email.</p>"
    )
)

# Send template email
result = await agent.send_email_via_mcp(
    user_id="user_uuid",
    email_request=EmailRequest(
        to=[{"email": "user@example.com"}],
        template_id="welcome_template",
        template_data={"name": "John", "company": "Acme"}
    )
)
```

## 🤖 Langchain Tool Integration

```python
# Create Langchain tool
email_tool = SendEmailTool(smtp_agent=agent)

# Add to agent
from langchain.agents import initialize_agent
from langchain.llms import OpenAI

llm = OpenAI()
tools = [email_tool]

langchain_agent = initialize_agent(
    tools=tools,
    llm=llm,
    agent=AgentType.CONVERSATIONAL_REACT_DESCRIPTION
)

# Use with natural language
response = langchain_agent.run(
    "Send a welcome email to john@example.com with subject 'Welcome to our platform'"
)
```

## 🔐 Security Features

- **User Authentication**: Supabase auth tokens
- **Password Encryption**: Fernet encryption for stored passwords
- **Row Level Security**: Database-level access control
- **Input Validation**: Email address and content validation
- **Audit Logging**: Complete email sending history

## 📈 Monitoring & Analytics

```python
# Get user email analytics
analytics = await agent.get_email_analytics(
    user_id="user_uuid",
    start_date=datetime.now() - timedelta(days=30)
)

# Returns: {"total": 150, "sent": 145, "failed": 5, "success_rate": 96.7}
```

## 🚨 Error Handling

```python
try:
    result = await agent.send_email_via_mcp(user_id, email_request)
    if result["success"]:
        print(f"Email sent: {result['data']['messageId']}")
    else:
        print(f"Failed: {result['error']}")
except Exception as e:
    print(f"Error: {e}")
```

## 📞 Support

- **API Docs**: http://localhost:3008/docs
- **Health Check**: http://localhost:3008/api/health
- **Documentation**: [Full Integration Guide](./langchain-guide.md)
