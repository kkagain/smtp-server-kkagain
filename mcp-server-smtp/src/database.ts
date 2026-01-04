import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import sqlite3 from 'sqlite3';
import { Client as PgClient } from 'pg';
import { createClient } from '@supabase/supabase-js';
import geoip from 'geoip-lite';
import moment from 'moment';
import { logToFile } from './index.js';

// Database configuration interface
export interface DatabaseConfig {
  type: 'sqlite' | 'postgres' | 'supabase';
  url?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
}

// Enhanced interfaces
export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  apiKey?: string;
  role: 'admin' | 'user' | 'readonly';
  isActive: boolean;
  settings?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

export interface SmtpConfig {
  id: string;
  userId?: string;
  name: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  passwordEncrypted: string;
  isDefault: boolean;
  isActive: boolean;
  maxConnections?: number;
  rateLimit?: number;
  successCount: number;
  failureCount: number;
  createdAt: string;
  updatedAt: string;
  lastUsed?: string;
}

export interface EmailTemplate {
  id: string;
  userId?: string;
  name: string;
  subject: string;
  htmlBody?: string;
  textBody?: string;
  variables?: string[];
  category?: string;
  isDefault: boolean;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  userId?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  position?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  isActive: boolean;
  isSubscribed: boolean;
  bounceCount: number;
  complaintCount: number;
  createdAt: string;
  updatedAt: string;
  lastContacted?: string;
}

export interface ContactList {
  id: string;
  userId?: string;
  name: string;
  description?: string;
  totalContacts: number;
  activeContacts: number;
  createdAt: string;
  updatedAt: string;
}

export interface EmailCampaign {
  id: string;
  userId?: string;
  name: string;
  subject: string;
  templateId?: string;
  senderName?: string;
  senderEmail?: string;
  replyTo?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled';
  scheduleAt?: string;
  sentAt?: string;
  totalRecipients: number;
  emailsSent: number;
  emailsDelivered: number;
  emailsBounced: number;
  emailsOpened: number;
  emailsClicked: number;
  emailsUnsubscribed: number;
  emailsComplained: number;
  createdAt: string;
  updatedAt: string;
}

export interface EmailLog {
  id: string;
  userId?: string;
  campaignId?: string;
  templateId?: string;
  smtpConfigId?: string;
  messageId?: string;
  recipientEmail: string;
  recipientName?: string;
  senderEmail: string;
  senderName?: string;
  subject: string;
  status: 'queued' | 'sending' | 'sent' | 'delivered' | 'bounced' | 'complained' | 'opened' | 'clicked';
  priority: number;
  retryCount: number;
  errorMessage?: string;

  // Tracking timestamps
  sentAt?: string;
  deliveredAt?: string;
  openedAt?: string;
  firstOpenedAt?: string;
  lastOpenedAt?: string;
  openCount: number;
  clickCount: number;
  bouncedAt?: string;
  bounceType?: 'hard' | 'soft' | 'technical';
  bounceReason?: string;
  complainedAt?: string;
  unsubscribedAt?: string;

  // Geolocation data
  senderIp?: string;
  recipientIp?: string;
  senderCountry?: string;
  senderCity?: string;
  recipientCountry?: string;
  recipientCity?: string;
  userAgent?: string;

  // Content metadata
  emailSize?: number;
  hasAttachments: boolean;
  attachmentCount: number;
  htmlVersion: boolean;
  textVersion: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface EmailEvent {
  id: string;
  emailLogId: string;
  eventType: 'open' | 'click' | 'bounce' | 'complaint' | 'unsubscribe' | 'spam';
  eventData?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  country?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timestamp: string;
}

export interface Webhook {
  id: string;
  userId?: string;
  name: string;
  url: string;
  events: string[];
  secret?: string;
  isActive: boolean;
  retryCount: number;
  timeoutSeconds: number;
  successCount: number;
  failureCount: number;
  createdAt: string;
  updatedAt: string;
  lastTriggered?: string;
}

export class DatabaseManager {
  private config: DatabaseConfig;
  private sqliteDb?: sqlite3.Database;
  private pgClient?: PgClient;
  private supabase?: any;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      switch (this.config.type) {
        case 'sqlite':
          await this.initializeSQLite();
          break;
        case 'postgres':
          await this.initializePostgreSQL();
          break;
        case 'supabase':
          await this.initializeSupabase();
          break;
        default:
          throw new Error(`Unsupported database type: ${this.config.type}`);
      }

      await this.createTables();
      logToFile(`Database initialized: ${this.config.type}`);
    } catch (error) {
      logToFile(`Database initialization failed: ${error}`);
      throw error;
    }
  }

  private async initializeSQLite(): Promise<void> {
    const dbPath = this.config.url || './data/smtp_server.db';
    const dbDir = path.dirname(dbPath);

    // Ensure directory exists
    await fs.ensureDir(dbDir);

    this.sqliteDb = new sqlite3.Database(dbPath);

    // Enable foreign keys
    await new Promise<void>((resolve, reject) => {
      this.sqliteDb!.exec('PRAGMA foreign_keys = ON', (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private async initializePostgreSQL(): Promise<void> {
    this.pgClient = new PgClient({
      connectionString: this.config.url,
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.username,
      password: this.config.password,
    });

    await this.pgClient.connect();
  }

  private async initializeSupabase(): Promise<void> {
    if (!this.config.supabaseUrl || !this.config.supabaseKey) {
      throw new Error('Supabase URL and key are required');
    }

    this.supabase = createClient(this.config.supabaseUrl, this.config.supabaseKey);
  }

  private async createTables(): Promise<void> {
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf-8');

    if (this.config.type === 'sqlite' && this.sqliteDb) {
      // Split schema into individual statements for SQLite
      const statements = schema.split(';').filter(stmt => stmt.trim());
      for (const statement of statements) {
        if (statement.trim()) {
          await new Promise<void>((resolve, reject) => {
            this.sqliteDb!.exec(statement, (err: Error | null) => {
              if (err) reject(err);
              else resolve();
            });
          });
        }
      }
    } else if (this.config.type === 'postgres' && this.pgClient) {
      await this.pgClient.query(schema);
    }
    // Supabase tables should be created through the dashboard or migrations
  }

  // Email Log operations with enhanced tracking
  async createEmailLog(emailLog: Partial<EmailLog>): Promise<EmailLog> {
    const id = uuidv4();
    const now = moment().toISOString();

    // Add geolocation data if IP is provided
    if (emailLog.senderIp) {
      const geo = geoip.lookup(emailLog.senderIp);
      if (geo) {
        emailLog.senderCountry = geo.country;
        emailLog.senderCity = geo.city;
      }
    }

    const newEmailLog: EmailLog = {
      id,
      userId: emailLog.userId,
      campaignId: emailLog.campaignId,
      templateId: emailLog.templateId,
      smtpConfigId: emailLog.smtpConfigId,
      messageId: emailLog.messageId,
      recipientEmail: emailLog.recipientEmail!,
      recipientName: emailLog.recipientName,
      senderEmail: emailLog.senderEmail!,
      senderName: emailLog.senderName,
      subject: emailLog.subject!,
      status: emailLog.status || 'queued',
      priority: emailLog.priority || 1,
      retryCount: emailLog.retryCount || 0,
      errorMessage: emailLog.errorMessage,

      sentAt: emailLog.sentAt,
      deliveredAt: emailLog.deliveredAt,
      openedAt: emailLog.openedAt,
      firstOpenedAt: emailLog.firstOpenedAt,
      lastOpenedAt: emailLog.lastOpenedAt,
      openCount: emailLog.openCount || 0,
      clickCount: emailLog.clickCount || 0,
      bouncedAt: emailLog.bouncedAt,
      bounceType: emailLog.bounceType,
      bounceReason: emailLog.bounceReason,
      complainedAt: emailLog.complainedAt,
      unsubscribedAt: emailLog.unsubscribedAt,

      senderIp: emailLog.senderIp,
      recipientIp: emailLog.recipientIp,
      senderCountry: emailLog.senderCountry,
      senderCity: emailLog.senderCity,
      recipientCountry: emailLog.recipientCountry,
      recipientCity: emailLog.recipientCity,
      userAgent: emailLog.userAgent,

      emailSize: emailLog.emailSize,
      hasAttachments: emailLog.hasAttachments || false,
      attachmentCount: emailLog.attachmentCount || 0,
      htmlVersion: emailLog.htmlVersion || false,
      textVersion: emailLog.textVersion || false,

      createdAt: now,
      updatedAt: now,
    };

    if (this.config.type === 'sqlite' && this.sqliteDb) {
      const insertStmt = `
        INSERT INTO email_logs (
          id, user_id, campaign_id, template_id, smtp_config_id, message_id,
          recipient_email, recipient_name, sender_email, sender_name, subject,
          status, priority, retry_count, error_message, sent_at, delivered_at,
          opened_at, first_opened_at, last_opened_at, open_count, click_count,
          bounced_at, bounce_type, bounce_reason, complained_at, unsubscribed_at,
          sender_ip, recipient_ip, sender_country, sender_city, recipient_country,
          recipient_city, user_agent, email_size, has_attachments, attachment_count,
          html_version, text_version, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        newEmailLog.id, newEmailLog.userId, newEmailLog.campaignId, newEmailLog.templateId,
        newEmailLog.smtpConfigId, newEmailLog.messageId, newEmailLog.recipientEmail,
        newEmailLog.recipientName, newEmailLog.senderEmail, newEmailLog.senderName,
        newEmailLog.subject, newEmailLog.status, newEmailLog.priority, newEmailLog.retryCount,
        newEmailLog.errorMessage, newEmailLog.sentAt, newEmailLog.deliveredAt,
        newEmailLog.openedAt, newEmailLog.firstOpenedAt, newEmailLog.lastOpenedAt,
        newEmailLog.openCount, newEmailLog.clickCount, newEmailLog.bouncedAt,
        newEmailLog.bounceType, newEmailLog.bounceReason, newEmailLog.complainedAt,
        newEmailLog.unsubscribedAt, newEmailLog.senderIp, newEmailLog.recipientIp,
        newEmailLog.senderCountry, newEmailLog.senderCity, newEmailLog.recipientCountry,
        newEmailLog.recipientCity, newEmailLog.userAgent, newEmailLog.emailSize,
        newEmailLog.hasAttachments, newEmailLog.attachmentCount, newEmailLog.htmlVersion,
        newEmailLog.textVersion, newEmailLog.createdAt, newEmailLog.updatedAt
      ];

      await new Promise<void>((resolve, reject) => {
        this.sqliteDb!.run(insertStmt, values, function (err: Error | null) {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    return newEmailLog;
  }

  async updateEmailLogStatus(id: string, status: string, additionalData?: Partial<EmailLog>): Promise<void> {
    const now = moment().toISOString();

    if (this.config.type === 'sqlite' && this.sqliteDb) {
      let updateClause = 'status = ?, updated_at = ?';
      let values: any[] = [status, now];

      if (additionalData) {
        if (additionalData.deliveredAt) {
          updateClause += ', delivered_at = ?';
          values.push(additionalData.deliveredAt);
        }
        if (additionalData.openedAt) {
          updateClause += ', opened_at = ?, open_count = open_count + 1';
          values.push(additionalData.openedAt);

          if (!additionalData.firstOpenedAt) {
            updateClause += ', first_opened_at = ?';
            values.push(additionalData.openedAt);
          }
        }
        if (additionalData.clickCount !== undefined) {
          updateClause += ', click_count = click_count + 1';
        }
        if (additionalData.bouncedAt) {
          updateClause += ', bounced_at = ?';
          values.push(additionalData.bouncedAt);
        }
        if (additionalData.bounceType) {
          updateClause += ', bounce_type = ?';
          values.push(additionalData.bounceType);
        }
        if (additionalData.bounceReason) {
          updateClause += ', bounce_reason = ?';
          values.push(additionalData.bounceReason);
        }
      }

      values.push(id);

      const updateStmt = `UPDATE email_logs SET ${updateClause} WHERE id = ?`;

      await new Promise<void>((resolve, reject) => {
        this.sqliteDb!.run(updateStmt, values, function (err: Error | null) {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }

  async createEmailEvent(event: Partial<EmailEvent>): Promise<EmailEvent> {
    const id = uuidv4();
    const now = moment().toISOString();

    // Add geolocation data if IP is provided
    let geoData = {};
    if (event.ipAddress) {
      const geo = geoip.lookup(event.ipAddress);
      if (geo) {
        geoData = {
          country: geo.country,
          city: geo.city,
          latitude: geo.ll[0],
          longitude: geo.ll[1],
        };
      }
    }

    const newEvent: EmailEvent = {
      id,
      emailLogId: event.emailLogId!,
      eventType: event.eventType!,
      eventData: event.eventData,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      timestamp: now,
      ...geoData,
    };

    if (this.config.type === 'sqlite' && this.sqliteDb) {
      const stmt = this.sqliteDb.prepare(`
        INSERT INTO email_events (
          id, email_log_id, event_type, event_data, ip_address, user_agent,
          country, city, latitude, longitude, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run([
        newEvent.id, newEvent.emailLogId, newEvent.eventType,
        JSON.stringify(newEvent.eventData), newEvent.ipAddress, newEvent.userAgent,
        newEvent.country, newEvent.city, newEvent.latitude, newEvent.longitude,
        newEvent.timestamp
      ]);
    }

    return newEvent;
  }

  // Contact management
  async createContact(contact: Partial<Contact>): Promise<Contact> {
    const id = uuidv4();
    const now = moment().toISOString();

    const newContact: Contact = {
      id,
      userId: contact.userId,
      email: contact.email!,
      firstName: contact.firstName,
      lastName: contact.lastName,
      phone: contact.phone,
      company: contact.company,
      position: contact.position,
      tags: contact.tags || [],
      customFields: contact.customFields || {},
      isActive: contact.isActive !== false,
      isSubscribed: contact.isSubscribed !== false,
      bounceCount: contact.bounceCount || 0,
      complaintCount: contact.complaintCount || 0,
      createdAt: now,
      updatedAt: now,
      lastContacted: contact.lastContacted,
    };

    if (this.config.type === 'sqlite' && this.sqliteDb) {
      const stmt = this.sqliteDb.prepare(`
        INSERT INTO contacts (
          id, user_id, email, first_name, last_name, phone, company, position,
          tags, custom_fields, is_active, is_subscribed, bounce_count,
          complaint_count, created_at, updated_at, last_contacted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run([
        newContact.id, newContact.userId, newContact.email, newContact.firstName,
        newContact.lastName, newContact.phone, newContact.company, newContact.position,
        JSON.stringify(newContact.tags), JSON.stringify(newContact.customFields),
        newContact.isActive, newContact.isSubscribed, newContact.bounceCount,
        newContact.complaintCount, newContact.createdAt, newContact.updatedAt,
        newContact.lastContacted
      ]);
    }

    return newContact;
  }

  // Analytics and reporting methods
  async getEmailStatistics(userId?: string, dateFrom?: string, dateTo?: string): Promise<any> {
    if (this.config.type === 'sqlite' && this.sqliteDb) {
      let query = `
        SELECT 
          status,
          COUNT(*) as count,
          DATE(created_at) as date
        FROM email_logs
        WHERE 1=1
      `;

      const params: any[] = [];

      if (userId) {
        query += ' AND user_id = ?';
        params.push(userId);
      }

      if (dateFrom) {
        query += ' AND created_at >= ?';
        params.push(dateFrom);
      }

      if (dateTo) {
        query += ' AND created_at <= ?';
        params.push(dateTo);
      }

      query += ' GROUP BY status, DATE(created_at) ORDER BY date DESC';

      const stmt = this.sqliteDb.prepare(query);
      return stmt.all(params);
    }

    return [];
  }

  async getTopCountries(userId?: string, limit: number = 10): Promise<any> {
    if (this.config.type === 'sqlite' && this.sqliteDb) {
      let query = `
        SELECT 
          recipient_country as country,
          COUNT(*) as email_count
        FROM email_logs
        WHERE recipient_country IS NOT NULL
      `;

      const params: any[] = [];

      if (userId) {
        query += ' AND user_id = ?';
        params.push(userId);
      }

      query += ' GROUP BY recipient_country ORDER BY email_count DESC LIMIT ?';
      params.push(limit);

      const stmt = this.sqliteDb.prepare(query);
      return stmt.all(params);
    }

    return [];
  }

  // Webhook management
  async createWebhook(webhook: Partial<Webhook>): Promise<Webhook> {
    const id = uuidv4();
    const now = moment().toISOString();

    const newWebhook: Webhook = {
      id,
      userId: webhook.userId,
      name: webhook.name || 'Unnamed Webhook',
      url: webhook.url!,
      events: webhook.events || [],
      secret: webhook.secret,
      isActive: webhook.isActive !== false,
      retryCount: webhook.retryCount || 3,
      timeoutSeconds: webhook.timeoutSeconds || 30,
      successCount: 0,
      failureCount: 0,
      createdAt: now,
      updatedAt: now
    };

    if (this.config.type === 'sqlite' && this.sqliteDb) {
      const stmt = this.sqliteDb.prepare(`
        INSERT INTO webhooks (
          id, user_id, name, url, events, secret, is_active,
          retry_count, timeout_seconds, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run([
        newWebhook.id, newWebhook.userId, newWebhook.name, newWebhook.url,
        JSON.stringify(newWebhook.events), newWebhook.secret, newWebhook.isActive,
        newWebhook.retryCount, newWebhook.timeoutSeconds, newWebhook.createdAt, newWebhook.updatedAt
      ]);
    }

    return newWebhook;
  }

  async getWebhooks(userId?: string): Promise<Webhook[]> {
    if (this.config.type === 'sqlite' && this.sqliteDb) {
      let query = 'SELECT * FROM webhooks WHERE 1=1';
      const params: any[] = [];

      if (userId) {
        query += ' AND user_id = ?';
        params.push(userId);
      }

      return new Promise((resolve, reject) => {
        const stmt = this.sqliteDb!.prepare(query);
        stmt.all(params, (err: Error | null, rows: any[]) => {
          if (err) {
            reject(err);
          } else {
            const webhooks = rows.map((row: any) => ({
              ...row,
              events: JSON.parse(row.events || '[]'),
              isActive: row.is_active === 1
            }));
            resolve(webhooks);
          }
        });
      });
    }
    return [];
  }

  async getWebhooksByEvent(eventType: string, userId?: string): Promise<Webhook[]> {
    // In a real implementation, we would query the JSON, but for SQLite simple array check
    // we fetch all and filter in memory for simplicity, or use LIKE
    const webhooks = await this.getWebhooks(userId);
    return webhooks.filter(wh => wh.isActive && (wh.events.includes(eventType) || wh.events.includes('*')));
  }

  async logWebhookDelivery(delivery: {
    webhookId: string;
    eventType: string;
    payload: any;
    responseStatus?: number;
    responseBody?: string;
    responseTimeMs?: number;
    success: boolean;
  }): Promise<void> {
    const id = uuidv4();
    const now = moment().toISOString();

    if (this.config.type === 'sqlite' && this.sqliteDb) {
      // Log delivery
      const stmt = this.sqliteDb.prepare(`
        INSERT INTO webhook_deliveries (
          id, webhook_id, event_type, payload, response_status,
          response_body, response_time_ms, delivered_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run([
        id, delivery.webhookId, delivery.eventType, JSON.stringify(delivery.payload),
        delivery.responseStatus, delivery.responseBody, delivery.responseTimeMs,
        now, now
      ]);

      // Update success/failure counts
      const updateStmt = this.sqliteDb.prepare(`
        UPDATE webhooks 
        SET ${delivery.success ? 'success_count = success_count + 1' : 'failure_count = failure_count + 1'},
            last_triggered = ?
        WHERE id = ?
      `);

      updateStmt.run([now, delivery.webhookId]);
    }
  }

  async close(): Promise<void> {
    if (this.sqliteDb) {
      this.sqliteDb.close();
    }
    if (this.pgClient) {
      await this.pgClient.end();
    }
  }
}

// Export a singleton instance
let dbManager: DatabaseManager | null = null;

export function getDatabaseManager(): DatabaseManager {
  if (!dbManager) {
    const config: DatabaseConfig = {
      type: (process.env.DATABASE_TYPE as 'sqlite' | 'postgres' | 'supabase') || 'sqlite',
      url: process.env.DATABASE_URL,
      host: process.env.POSTGRES_HOST,
      port: process.env.POSTGRES_PORT ? parseInt(process.env.POSTGRES_PORT) : undefined,
      database: process.env.POSTGRES_DB,
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_ANON_KEY,
    };

    dbManager = new DatabaseManager(config);
  }

  return dbManager;
}

export async function initializeDatabase(): Promise<void> {
  const db = getDatabaseManager();
  await db.initialize();
}
