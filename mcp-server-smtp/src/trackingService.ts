import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { getDatabaseManager } from './database.js';
import { logToFile } from './index.js';
import geoip from 'geoip-lite';

export class TrackingService {
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
      max: 1000, // limit each IP to 1000 requests per windowMs
      message: 'Too many requests from this IP',
    });
    this.app.use(limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  }

  private setupRoutes(): void {
    // Email open tracking
    this.app.get('/track/open/:trackingId', async (req, res) => {
      try {
        const { trackingId } = req.params;
        const ip = this.getClientIP(req);
        const userAgent = req.get('User-Agent') || '';

        // Record open event
        await this.recordEmailEvent(trackingId, 'open', {
          ip,
          userAgent,
          timestamp: new Date().toISOString(),
        });

        // Serve 1x1 transparent pixel
        const pixel = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAHG7lnGkwAAAABJRU5ErkJggg==',
          'base64'
        );

        res.set({
          'Content-Type': 'image/png',
          'Content-Length': pixel.length,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        });

        res.send(pixel);
      } catch (error) {
        logToFile(`Error tracking email open: ${error}`);
        res.status(200).send('OK'); // Always return 200 for tracking pixels
      }
    });

    // Email click tracking
    this.app.get('/track/click/:trackingId', async (req, res) => {
      try {
        const { trackingId } = req.params;
        const { url } = req.query;
        const ip = this.getClientIP(req);
        const userAgent = req.get('User-Agent') || '';

        if (!url) {
          return res.status(400).send('URL parameter required');
        }

        // Record click event
        await this.recordEmailEvent(trackingId, 'click', {
          ip,
          userAgent,
          url: decodeURIComponent(url as string),
          timestamp: new Date().toISOString(),
        });

        // Redirect to original URL
        res.redirect(decodeURIComponent(url as string));
      } catch (error) {
        logToFile(`Error tracking email click: ${error}`);
        res.status(500).send('Error processing click');
      }
    });

    // Unsubscribe tracking
    this.app.get('/unsubscribe/:trackingId', async (req, res) => {
      try {
        const { trackingId } = req.params;
        const ip = this.getClientIP(req);
        const userAgent = req.get('User-Agent') || '';

        // Record unsubscribe event
        await this.recordEmailEvent(trackingId, 'unsubscribe', {
          ip,
          userAgent,
          timestamp: new Date().toISOString(),
        });

        // Show unsubscribe confirmation
        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Unsubscribed</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .message { background: #f0f0f0; padding: 20px; border-radius: 10px; display: inline-block; }
            </style>
          </head>
          <body>
            <div class="message">
              <h2>Successfully Unsubscribed</h2>
              <p>You have been removed from our mailing list.</p>
            </div>
          </body>
          </html>
        `);
      } catch (error) {
        logToFile(`Error tracking unsubscribe: ${error}`);
        res.status(500).send('Error processing unsubscribe');
      }
    });

    // Email analytics API
    this.app.get('/api/analytics/:trackingId', async (req, res) => {
      try {
        const { trackingId } = req.params;
        
        // Get email log
        const emailLog = await this.getEmailLogByTrackingId(trackingId);
        if (!emailLog) {
          return res.status(404).json({ error: 'Email not found' });
        }

        // Get all events for this email
        const events = await this.getEmailEvents(emailLog.id);
        
        // Compile analytics
        const analytics = {
          messageId: emailLog.messageId,
          recipientEmail: emailLog.recipientEmail,
          subject: emailLog.subject,
          status: emailLog.status,
          sentAt: emailLog.sentAt,
          deliveredAt: emailLog.deliveredAt,
          events: events.map(event => ({
            type: event.eventType,
            timestamp: event.timestamp,
            country: event.country,
            city: event.city,
            userAgent: event.userAgent,
            data: event.eventData,
          })),
          summary: {
            sent: !!emailLog.sentAt,
            delivered: !!emailLog.deliveredAt,
            opened: emailLog.openCount > 0,
            clicked: emailLog.clickCount > 0,
            bounced: !!emailLog.bouncedAt,
            complained: !!emailLog.complainedAt,
            unsubscribed: !!emailLog.unsubscribedAt,
            openCount: emailLog.openCount,
            clickCount: emailLog.clickCount,
          },
        };

        res.json(analytics);
      } catch (error) {
        logToFile(`Error getting email analytics: ${error}`);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Bulk analytics API
    this.app.get('/api/analytics/campaign/:campaignId', async (req, res) => {
      try {
        const { campaignId } = req.params;
        const { dateFrom, dateTo } = req.query;

        const stats = await this.dbManager.getEmailStatistics(
          undefined, // userId
          dateFrom as string,
          dateTo as string
        );

        const geoStats = await this.dbManager.getTopCountries(undefined, 10);

        res.json({
          campaignId,
          statistics: stats,
          topCountries: geoStats,
          dateRange: { from: dateFrom, to: dateTo },
        });
      } catch (error) {
        logToFile(`Error getting campaign analytics: ${error}`);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'OK', timestamp: new Date().toISOString() });
    });
  }

  private getClientIP(req: express.Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.headers['x-real-ip'] as string ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      ''
    );
  }

  private async recordEmailEvent(
    trackingId: string,
    eventType: string,
    eventData: any
  ): Promise<void> {
    try {
      // Find email log by tracking ID (this would need to be implemented in database manager)
      const emailLog = await this.getEmailLogByTrackingId(trackingId);
      if (!emailLog) {
        logToFile(`Email log not found for tracking ID: ${trackingId}`);
        return;
      }

      // Add geolocation if IP is available
      if (eventData.ip) {
        const geo = geoip.lookup(eventData.ip);
        if (geo) {
          eventData.country = geo.country;
          eventData.city = geo.city;
          eventData.latitude = geo.ll[0];
          eventData.longitude = geo.ll[1];
        }
      }

      // Create email event
      await this.dbManager.createEmailEvent({
        emailLogId: emailLog.id,
        eventType: eventType as any,
        eventData,
        ipAddress: eventData.ip,
        userAgent: eventData.userAgent,
      });

      // Update email log status
      const updateData: any = {};
      if (eventType === 'open') {
        updateData.openedAt = eventData.timestamp;
        if (!emailLog.firstOpenedAt) {
          updateData.firstOpenedAt = eventData.timestamp;
        }
      } else if (eventType === 'click') {
        updateData.clickCount = (emailLog.clickCount || 0) + 1;
      } else if (eventType === 'bounce') {
        updateData.bouncedAt = eventData.timestamp;
        updateData.bounceType = eventData.bounceType || 'soft';
        updateData.bounceReason = eventData.reason;
      } else if (eventType === 'complaint') {
        updateData.complainedAt = eventData.timestamp;
      } else if (eventType === 'unsubscribe') {
        updateData.unsubscribedAt = eventData.timestamp;
      }

      if (Object.keys(updateData).length > 0) {
        await this.dbManager.updateEmailLogStatus(emailLog.id, emailLog.status, updateData);
      }

      logToFile(`Recorded ${eventType} event for tracking ID: ${trackingId}`);
    } catch (error) {
      logToFile(`Error recording email event: ${error}`);
    }
  }

  private async getEmailLogByTrackingId(trackingId: string): Promise<any> {
    // This method would need to be implemented in the database manager
    // For now, return null
    return null;
  }

  private async getEmailEvents(emailLogId: string): Promise<any[]> {
    // This method would need to be implemented in the database manager
    // For now, return empty array
    return [];
  }

  async start(port: number = 3000): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(port, () => {
          logToFile(`Tracking service started on port ${port}`);
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
          logToFile('Tracking service stopped');
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
let trackingService: TrackingService | null = null;

export function getTrackingService(): TrackingService {
  if (!trackingService) {
    trackingService = new TrackingService();
  }
  return trackingService;
}

export async function startTrackingService(port?: number): Promise<void> {
  const service = getTrackingService();
  const trackingPort = port || parseInt(process.env.TRACKING_PORT || '3000');
  await service.start(trackingPort);
}
