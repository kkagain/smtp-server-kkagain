-- Enhanced SMTP MCP Server Database Schema
-- Supports SQLite, PostgreSQL, and can be adapted for Supabase

-- Users table for authentication and user management
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    api_key VARCHAR(255) UNIQUE,
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    settings JSON
);

-- SMTP configurations table (enhanced)
CREATE TABLE IF NOT EXISTS smtp_configs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    name VARCHAR(255) NOT NULL,
    host VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL,
    secure BOOLEAN DEFAULT false,
    username VARCHAR(255) NOT NULL,
    password_encrypted TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    max_connections INTEGER DEFAULT 5,
    rate_limit INTEGER DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Email templates table (enhanced)
CREATE TABLE IF NOT EXISTS email_templates (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    name VARCHAR(255) NOT NULL,
    subject TEXT NOT NULL,
    html_body TEXT,
    text_body TEXT,
    variables JSON,
    category VARCHAR(100),
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Contact lists and management
CREATE TABLE IF NOT EXISTS contact_lists (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    total_contacts INTEGER DEFAULT 0,
    active_contacts INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    phone VARCHAR(50),
    company VARCHAR(255),
    position VARCHAR(255),
    tags JSON,
    custom_fields JSON,
    is_active BOOLEAN DEFAULT true,
    is_subscribed BOOLEAN DEFAULT true,
    bounce_count INTEGER DEFAULT 0,
    complaint_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_contacted TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Many-to-many relationship between contacts and lists
CREATE TABLE IF NOT EXISTS contact_list_members (
    id VARCHAR(36) PRIMARY KEY,
    contact_id VARCHAR(36),
    list_id VARCHAR(36),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    FOREIGN KEY (list_id) REFERENCES contact_lists(id) ON DELETE CASCADE,
    UNIQUE(contact_id, list_id)
);

-- Email campaigns
CREATE TABLE IF NOT EXISTS email_campaigns (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    template_id VARCHAR(36),
    sender_name VARCHAR(255),
    sender_email VARCHAR(255),
    reply_to VARCHAR(255),
    status VARCHAR(50) DEFAULT 'draft', -- draft, scheduled, sending, sent, paused, cancelled
    schedule_at TIMESTAMP,
    sent_at TIMESTAMP,
    total_recipients INTEGER DEFAULT 0,
    emails_sent INTEGER DEFAULT 0,
    emails_delivered INTEGER DEFAULT 0,
    emails_bounced INTEGER DEFAULT 0,
    emails_opened INTEGER DEFAULT 0,
    emails_clicked INTEGER DEFAULT 0,
    emails_unsubscribed INTEGER DEFAULT 0,
    emails_complained INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES email_templates(id) ON DELETE SET NULL
);

-- Enhanced email logs with comprehensive tracking
CREATE TABLE IF NOT EXISTS email_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    campaign_id VARCHAR(36),
    template_id VARCHAR(36),
    smtp_config_id VARCHAR(36),
    message_id VARCHAR(255) UNIQUE,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    sender_email VARCHAR(255) NOT NULL,
    sender_name VARCHAR(255),
    subject TEXT NOT NULL,
    status VARCHAR(50) NOT NULL, -- queued, sending, sent, delivered, bounced, complained, opened, clicked
    priority INTEGER DEFAULT 1,
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    
    -- Tracking data
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    first_opened_at TIMESTAMP,
    last_opened_at TIMESTAMP,
    open_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    bounced_at TIMESTAMP,
    bounce_type VARCHAR(50), -- hard, soft, technical
    bounce_reason TEXT,
    complained_at TIMESTAMP,
    unsubscribed_at TIMESTAMP,
    
    -- IP and geolocation data
    sender_ip VARCHAR(45),
    recipient_ip VARCHAR(45),
    sender_country VARCHAR(100),
    sender_city VARCHAR(100),
    recipient_country VARCHAR(100),
    recipient_city VARCHAR(100),
    user_agent TEXT,
    
    -- Email content metadata
    email_size INTEGER,
    has_attachments BOOLEAN DEFAULT false,
    attachment_count INTEGER DEFAULT 0,
    html_version BOOLEAN DEFAULT false,
    text_version BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id) ON DELETE SET NULL,
    FOREIGN KEY (template_id) REFERENCES email_templates(id) ON DELETE SET NULL,
    FOREIGN KEY (smtp_config_id) REFERENCES smtp_configs(id) ON DELETE SET NULL
);

-- Email tracking events (opens, clicks, etc.)
CREATE TABLE IF NOT EXISTS email_events (
    id VARCHAR(36) PRIMARY KEY,
    email_log_id VARCHAR(36),
    event_type VARCHAR(50) NOT NULL, -- open, click, bounce, complaint, unsubscribe, spam
    event_data JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    country VARCHAR(100),
    city VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (email_log_id) REFERENCES email_logs(id) ON DELETE CASCADE
);

-- Click tracking for links in emails
CREATE TABLE IF NOT EXISTS email_links (
    id VARCHAR(36) PRIMARY KEY,
    email_log_id VARCHAR(36),
    original_url TEXT NOT NULL,
    tracked_url TEXT NOT NULL,
    link_text VARCHAR(500),
    click_count INTEGER DEFAULT 0,
    unique_clicks INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (email_log_id) REFERENCES email_logs(id) ON DELETE CASCADE
);

-- Link click events
CREATE TABLE IF NOT EXISTS link_clicks (
    id VARCHAR(36) PRIMARY KEY,
    email_link_id VARCHAR(36),
    ip_address VARCHAR(45),
    user_agent TEXT,
    country VARCHAR(100),
    city VARCHAR(100),
    clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (email_link_id) REFERENCES email_links(id) ON DELETE CASCADE
);

-- Webhook configurations
CREATE TABLE IF NOT EXISTS webhooks (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    events JSON NOT NULL, -- array of event types to listen for
    secret VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    retry_count INTEGER DEFAULT 3,
    timeout_seconds INTEGER DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_triggered TIMESTAMP,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Webhook delivery logs
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id VARCHAR(36) PRIMARY KEY,
    webhook_id VARCHAR(36),
    event_type VARCHAR(50) NOT NULL,
    payload JSON NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    response_time_ms INTEGER,
    retry_count INTEGER DEFAULT 0,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE
);

-- Email queue for background processing
CREATE TABLE IF NOT EXISTS email_queue (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    campaign_id VARCHAR(36),
    priority INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'queued', -- queued, processing, completed, failed, cancelled
    scheduled_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    email_data JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id) ON DELETE CASCADE
);

-- Blacklist/suppressions
CREATE TABLE IF NOT EXISTS email_suppressions (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    reason VARCHAR(100) NOT NULL, -- bounce, complaint, unsubscribe, manual
    suppression_type VARCHAR(50) NOT NULL, -- temporary, permanent
    expires_at TIMESTAMP,
    added_by VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL
);

-- API usage tracking
CREATE TABLE IF NOT EXISTS api_usage (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    response_status INTEGER,
    response_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- System metrics and analytics
CREATE TABLE IF NOT EXISTS system_metrics (
    id VARCHAR(36) PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15, 4) NOT NULL,
    metric_type VARCHAR(50) NOT NULL, -- counter, gauge, histogram
    tags JSON,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_campaign_id ON email_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_events_type ON email_events(event_type);
CREATE INDEX IF NOT EXISTS idx_email_events_timestamp ON email_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_smtp_configs_user_id ON smtp_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled_at ON email_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage(created_at);
