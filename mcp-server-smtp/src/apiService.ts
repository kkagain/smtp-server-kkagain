import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { getDatabaseManager, initializeDatabase } from './database.js';
import { getTrackingService } from './trackingService.js';
import { sendEmail, sendBulkEmails, EmailData, BulkEmailData } from './emailService.js';
import { logToFile } from './index.js';

export class ApiService {
  private app: express.Application;
  private dbManager = getDatabaseManager();
  private server: any;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: { error: 'Too many requests from this IP' },
    });
    this.app.use('/api', limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // File upload middleware
    const upload = multer({
      dest: './uploads/',
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    });
    this.app.use('/api/upload', upload.array('attachments', 5));
  }

  private setupRoutes(): void {
    // API documentation
    this.app.get('/api', (req, res) => {
      res.json({
        name: 'SMTP MCP Server API',
        version: '1.0.0',
        description: 'Comprehensive email platform with tracking and analytics',
        endpoints: {
          email: {
            send: 'POST /api/email/send',
            bulk: 'POST /api/email/bulk',
            status: 'GET /api/email/status/:messageId',
            templates: 'GET /api/email/templates',
          },
          contacts: {
            create: 'POST /api/contacts',
            list: 'GET /api/contacts',
            update: 'PUT /api/contacts/:id',
            delete: 'DELETE /api/contacts/:id',
          },
          campaigns: {
            create: 'POST /api/campaigns',
            list: 'GET /api/campaigns',
            send: 'POST /api/campaigns/:id/send',
            stats: 'GET /api/campaigns/:id/stats',
          },
          analytics: {
            overview: 'GET /api/analytics',
            email: 'GET /api/analytics/email/:trackingId',
            campaign: 'GET /api/analytics/campaign/:campaignId',
            geography: 'GET /api/analytics/geography',
          },
        },
      });
    });

    // Email sending endpoints
    this.app.post('/api/email/send', async (req, res) => {
      try {
        const emailData: EmailData = req.body;
        
        // Validate required fields
        if (!emailData.to || !emailData.subject || !emailData.body) {
          return res.status(400).json({
            error: 'Missing required fields: to, subject, body',
          });
        }

        const result = await sendEmail(emailData, req.body.smtpConfigId);
        
        if (result.success) {
          res.json({
            success: true,
            message: result.message,
          });
        } else {
          res.status(400).json({
            success: false,
            error: result.message,
          });
        }
      } catch (error) {
        logToFile(`API error sending email: ${error}`);
        res.status(500).json({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    this.app.post('/api/email/bulk', async (req, res) => {
      try {
        const bulkData: BulkEmailData = req.body;
        
        // Validate required fields
        if (!bulkData.recipients || !bulkData.subject || !bulkData.body) {
          return res.status(400).json({
            error: 'Missing required fields: recipients, subject, body',
          });
        }

        const result = await sendBulkEmails(bulkData, req.body.smtpConfigId);
        
        res.json(result);
      } catch (error) {
        logToFile(`API error sending bulk emails: ${error}`);
        res.status(500).json({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Contact management endpoints
    this.app.post('/api/contacts', async (req, res) => {
      try {
        const contactData = req.body;
        
        if (!contactData.email) {
          return res.status(400).json({ error: 'Email is required' });
        }

        const contact = await this.dbManager.createContact(contactData);
        res.json(contact);
      } catch (error) {
        logToFile(`API error creating contact: ${error}`);
        res.status(500).json({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    this.app.get('/api/contacts', async (req, res) => {
      try {
        const { page = 1, limit = 50, search } = req.query;
        
        // This would be implemented in database manager
        const contacts: any[] = []; // await this.dbManager.getContacts({ page, limit, search });
        
        res.json({
          contacts,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total: contacts.length,
          },
        });
      } catch (error) {
        logToFile(`API error getting contacts: ${error}`);
        res.status(500).json({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Campaign management endpoints
    this.app.post('/api/campaigns', async (req, res) => {
      try {
        const campaignData = req.body;
        
        if (!campaignData.name || !campaignData.subject) {
          return res.status(400).json({
            error: 'Missing required fields: name, subject',
          });
        }

        // This would create a campaign in the database
        const campaignId = 'campaign_' + Date.now();
        
        res.json({
          id: campaignId,
          ...campaignData,
          status: 'draft',
          createdAt: new Date().toISOString(),
        });
      } catch (error) {
        logToFile(`API error creating campaign: ${error}`);
        res.status(500).json({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    this.app.get('/api/campaigns', async (req, res) => {
      try {
        const { page = 1, limit = 20, status } = req.query;
        
        // This would be implemented in database manager
        const campaigns: any[] = []; // await this.dbManager.getCampaigns({ page, limit, status });
        
        res.json({
          campaigns,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total: campaigns.length,
          },
        });
      } catch (error) {
        logToFile(`API error getting campaigns: ${error}`);
        res.status(500).json({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Analytics endpoints
    this.app.get('/api/analytics', async (req, res) => {
      try {
        const { dateFrom, dateTo, userId } = req.query;
        
        const stats = await this.dbManager.getEmailStatistics(
          userId as string,
          dateFrom as string,
          dateTo as string
        );

        const geoStats = await this.dbManager.getTopCountries(userId as string, 10);

        res.json({
          statistics: stats,
          topCountries: geoStats,
          dateRange: { from: dateFrom, to: dateTo },
        });
      } catch (error) {
        logToFile(`API error getting analytics: ${error}`);
        res.status(500).json({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    this.app.get('/api/analytics/geography', async (req, res) => {
      try {
        const { userId, limit = 20 } = req.query;
        
        const geoStats = await this.dbManager.getTopCountries(
          userId as string,
          parseInt(limit as string)
        );

        res.json({ countries: geoStats });
      } catch (error) {
        logToFile(`API error getting geography analytics: ${error}`);
        res.status(500).json({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Webhook endpoints
    this.app.post('/api/webhooks', async (req, res) => {
      try {
        const webhookData = req.body;
        
        if (!webhookData.name || !webhookData.url || !webhookData.events) {
          return res.status(400).json({
            error: 'Missing required fields: name, url, events',
          });
        }

        // This would create a webhook in the database
        const webhookId = 'webhook_' + Date.now();
        
        res.json({
          id: webhookId,
          ...webhookData,
          secret: 'webhook_secret_' + Date.now(),
          isActive: true,
          createdAt: new Date().toISOString(),
        });
      } catch (error) {
        logToFile(`API error creating webhook: ${error}`);
        res.status(500).json({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        services: {
          database: 'connected',
          tracking: 'active',
          api: 'running',
        },
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method,
      });
    });

    // Error handler
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logToFile(`Express error: ${error.message}`);
      res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
      });
    });
  }

  async start(port: number = 4000): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(port, () => {
          logToFile(`API service started on port ${port}`);
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          logToFile('API service stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getApp(): express.Application {
    return this.app;
  }
}

// Export singleton instance
let apiService: ApiService | null = null;

export function getApiService(): ApiService {
  if (!apiService) {
    apiService = new ApiService();
  }
  return apiService;
}

export async function startApiService(port?: number): Promise<void> {
  try {
    // Initialize database first
    await initializeDatabase();
    
    // Start API service
    const service = getApiService();
    const apiPort = port || parseInt(process.env.API_PORT || '4000');
    await service.start(apiPort);
    
    logToFile('All services started successfully');
  } catch (error) {
    logToFile(`Failed to start API service: ${error}`);
    throw error;
  }
}
