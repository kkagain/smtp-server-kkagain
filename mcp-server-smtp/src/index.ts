import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createToolDefinitions } from "./tools.js";
import {
  setupRequestHandlers,
  handleSendEmail,
  handleSendBulkEmails,
  handleGetSmtpConfigs,
  handleAddSmtpConfig,
  handleUpdateSmtpConfig,
  handleDeleteSmtpConfig,
  handleGetEmailTemplates,
  handleAddEmailTemplate,
  handleUpdateEmailTemplate,
  handleDeleteEmailTemplate,
  handleGetEmailLogs,
  handleGetWebhooks,
  handleAddWebhook,
  handleDeleteWebhook,
  handleReadInbox,
  handleReadThread,
  handleSearchEmails,
  handleMarkMessage,
  handleGetAttachments,
  handleSendGmail,
  handleReplyEmail,
  handleForwardEmail,
  handleGetEmail,
  handleGetThreadReplies,
  handleMarkSpam
} from "./requestHandler.js";
import { ensureConfigDirectories } from "./config.js";
import { setupSwagger } from "./swagger.js";
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';

// Load environment variables from the project directory (not cwd)
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Set up logging to a file instead of console
const logDir = path.join(os.tmpdir(), 'smtp-mcp-server-logs');
try {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
} catch (error) {
  // Silently fail if we can't create the log directory
}

const logFile = path.join(logDir, 'smtp-mcp-server.log');

export function logToFile(message: string): void {
  try {
    fs.appendFileSync(logFile, `${new Date().toISOString()} - ${message}\n`);
  } catch (error) {
    // Silently fail if we can't write to the log file
  }
}

/**
 * Main function to run the SMTP MCP server
 */
async function runServer() {
  try {
    // Ensure config directories exist
    await ensureConfigDirectories();

    // Initialize the server for stdio transport
    const server = new Server(
      {
        name: "smtp-email-server",
        version: "1.0.0",
        description: "SMTP Email MCP Server with template management"
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    // Set error handler
    server.onerror = (error) => logToFile(`[MCP Error] ${error}`);

    // Create tool definitions
    const TOOLS = createToolDefinitions();

    // Setup request handlers for stdio transport
    await setupRequestHandlers(server, TOOLS);

    // Start stdio transport for MCP
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logToFile("SMTP MCP Server started with stdio transport");

    // HTTP Server for REST API and Swagger Documentation
    const app = express();

    // Configure Multer for image uploads
    const storage = multer.diskStorage({
      destination: (req: any, file: any, cb: any) => {
        const uploadDir = path.join(process.cwd(), 'public', 'images');
        // Ensure directory exists
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req: any, file: any, cb: any) => {
        // Create unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'img-' + uniqueSuffix + ext);
      }
    });

    const upload = multer({
      storage: storage,
      limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
      },
      fileFilter: (req: any, file: any, cb: any) => {
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed!'));
        }
      }
    });
    const port = parseInt(process.env.PORT || '3007');

    // Middleware
    app.use(cors());
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Static files (Images)
    // accessible at http://localhost:3007/public/images/filename.jpg
    app.use('/public', express.static(path.join(process.cwd(), 'public')));

    // Setup Swagger documentation
    setupSwagger(app);

    // -------------------------------------------------------
    // MCP over HTTP+SSE transport (for remote VPS / agents)
    // -------------------------------------------------------
    // Each connecting agent gets its own Server instance + SSEServerTransport.
    // GET  /mcp/sse     — agent opens SSE stream (long-lived connection)
    // POST /mcp/message — agent sends tool calls / requests
    const sseTransports = new Map<string, SSEServerTransport>();

    app.get('/mcp/sse', apiKeyAuth, async (req: any, res: any) => {
      logToFile('[SSE] New MCP agent connected');
      const sseTransport = new SSEServerTransport('/mcp/message', res);
      const sseServer = new Server(
        { name: 'smtp-mcp-server', version: '1.0.0' },
        { capabilities: { tools: {} } }
      );
      const sseTools = createToolDefinitions();
      await setupRequestHandlers(sseServer, sseTools);
      await sseServer.connect(sseTransport);
      const sessionId = sseTransport.sessionId;
      sseTransports.set(sessionId, sseTransport);
      logToFile(`[SSE] Session started: ${sessionId}`);
      res.on('close', () => {
        sseTransports.delete(sessionId);
        logToFile(`[SSE] Session closed: ${sessionId}`);
      });
    });

    app.post('/mcp/message', apiKeyAuth, async (req: any, res: any) => {
      const sessionId = req.query.sessionId as string;
      const sseTransport = sseTransports.get(sessionId);
      if (!sseTransport) {
        return res.status(400).json({ error: 'No active SSE session for sessionId: ' + sessionId });
      }
      await sseTransport.handlePostMessage(req, res);
    });

    // -------------------------------------------------------
    // API routes with error handling wrapper
    const asyncHandler = (fn: (req: any, res: any) => Promise<any>) => (req: any, res: any) => {
      Promise.resolve(fn(req, res)).catch((error) => {
        logToFile(`API Error: ${error}`);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
      });
    };

    // API Routes

    // Image Upload Endpoint
    app.post('/api/upload-image', upload.single('image'), asyncHandler(async (req: any, res: any) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: 'No image file provided' });
        }

        // Construct public URL
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers['x-forwarded-host'] || req.get('host');
        // Handle standard vs proxied headers
        const hostHeader = Array.isArray(host) ? host[0] : host;
        const protocolHeader = Array.isArray(protocol) ? protocol[0] : protocol;

        const imageUrl = `${protocolHeader}://${hostHeader}/public/images/${req.file.filename}`;

        res.json({
          success: true,
          imageUrl: imageUrl,
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size
        });
      } catch (error) {
        logToFile(`Image upload error: ${error}`);
        res.status(500).json({ error: 'Image upload failed' });
      }
    }));
    app.post('/api/send-email', asyncHandler(async (req, res) => {
      const result = await handleSendEmail(req.body);
      res.json(result);
    }));

    app.post('/api/send-bulk-emails', asyncHandler(async (req, res) => {
      const result = await handleSendBulkEmails(req.body);
      res.json(result);
    }));

    app.get('/api/smtp-configs', asyncHandler(async (req, res) => {
      const result = await handleGetSmtpConfigs();
      res.json(result);
    }));

    app.post('/api/smtp-configs', asyncHandler(async (req, res) => {
      const result = await handleAddSmtpConfig(req.body);
      res.json(result);
    }));

    app.put('/api/smtp-configs/:id', asyncHandler(async (req, res) => {
      const result = await handleUpdateSmtpConfig({ ...req.body, id: req.params.id });
      res.json(result);
    }));

    app.delete('/api/smtp-configs/:id', asyncHandler(async (req, res) => {
      const result = await handleDeleteSmtpConfig({ id: req.params.id });
      res.json(result);
    }));

    app.get('/api/templates', asyncHandler(async (req, res) => {
      const result = await handleGetEmailTemplates();
      res.json(result);
    }));

    app.post('/api/templates', asyncHandler(async (req, res) => {
      const result = await handleAddEmailTemplate(req.body);
      res.json(result);
    }));

    app.put('/api/templates/:id', asyncHandler(async (req, res) => {
      const result = await handleUpdateEmailTemplate({ ...req.body, id: req.params.id });
      res.json(result);
    }));

    app.delete('/api/templates/:templateId', asyncHandler(async (req, res) => {
      const result = await handleDeleteEmailTemplate({ templateId: req.params.templateId });
      res.json(result);
    }));

    app.get('/api/email-logs', asyncHandler(async (req, res) => {
      const result = await handleGetEmailLogs(req.query);
      res.json(result);
    }));

    app.get('/api/webhooks', asyncHandler(async (req, res) => {
      const result = await handleGetWebhooks(req.query);
      res.json(result);
    }));

    app.post('/api/webhooks', asyncHandler(async (req, res) => {
      const result = await handleAddWebhook(req.body);
      res.json(result);
    }));

    app.delete('/api/webhooks', asyncHandler(async (req, res) => {
      const result = await handleDeleteWebhook(req.body); // or req.query/params depending on implementation using toolParams
      res.json(result);
    }));

    // Template endpoint aliases for backward compatibility
    app.get('/api/get-email-templates', asyncHandler(async (req, res) => {
      const result = await handleGetEmailTemplates();
      res.json(result);
    }));

    app.post('/api/add-email-template', asyncHandler(async (req, res) => {
      const result = await handleAddEmailTemplate(req.body);
      res.json(result);
    }));

    app.put('/api/update-email-template/:id', asyncHandler(async (req, res) => {
      const result = await handleUpdateEmailTemplate({ ...req.body, id: req.params.id });
      res.json(result);
    }));

    app.delete('/api/delete-email-template/:templateId', asyncHandler(async (req, res) => {
      const result = await handleDeleteEmailTemplate({ templateId: req.params.templateId });
      res.json(result);
    }));

    // Modern Email API Endpoints (with dynamic SMTP support)
    // NOTE: /api/email/send now uses Gmail OAuth (primary transport)
    // For explicit SMTP nodemailer sending use /api/email/smtp/send
    app.post('/api/email/smtp/send', asyncHandler(async (req, res) => {
      const result = await handleSendEmail(req.body);
      res.json(result);
    }));

    app.post('/api/email/send-bulk', asyncHandler(async (req, res) => {
      const result = await handleSendBulkEmails(req.body);
      res.json(result);
    }));

    app.post('/api/email/send-template', asyncHandler(async (req, res) => {
      // Convert template-based request to standard email format
      const { templateId, to, variables, smtpConfig, ...otherParams } = req.body;
      const emailData = {
        to: Array.isArray(to) ? to : [typeof to === 'string' ? { email: to } : to],
        subject: '', // Will be filled by template
        body: '', // Will be filled by template
        templateId,
        templateData: variables,
        smtpConfig,
        ...otherParams
      };
      const result = await handleSendEmail(emailData);
      res.json(result);
    }));

    app.get('/api/tools', asyncHandler(async (req, res) => {
      res.json({ tools: Object.values(TOOLS) });
    }));

    app.get('/api/health', asyncHandler(async (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0'
      });
    }));

    // List all available endpoints
    app.get('/api/endpoints', asyncHandler(async (req, res) => {
      res.json({
        message: 'SMTP MCP Server - Available API Endpoints',
        endpoints: {
          health: 'GET /api/health',
          tools: 'GET /api/tools',
          email: {
            send: 'POST /api/send-email',
            sendBulk: 'POST /api/send-bulk-emails'
          },
          templates: {
            getAll: 'GET /api/templates OR /api/get-email-templates',
            add: 'POST /api/templates OR /api/add-email-template',
            update: 'PUT /api/templates/:id OR /api/update-email-template/:id',
            delete: 'DELETE /api/templates/:templateId OR /api/delete-email-template/:templateId'
          },
          smtpConfigs: {
            getAll: 'GET /api/smtp-configs',
            add: 'POST /api/smtp-configs',
            update: 'PUT /api/smtp-configs/:id',
            delete: 'DELETE /api/smtp-configs/:id'
          },
          logs: 'GET /api/email-logs',
          documentation: 'GET /docs'
        }
      });
    }));

    // Root redirect to docs

    app.get('/', (req, res) => {
      res.redirect('/docs');
    });

    // -------------------------------------------------------
    // Stable REST API — designed for email_to_cosf.py migration
    // Auth: x-api-key header (value from .env API_KEY)
    // -------------------------------------------------------

    // POST /api/email/list — list messages (replaces users().messages().list())
    // Body: { maxResults?, q?, labelIds?, pageToken? }
    // Returns: { success, messages: [{id, threadId, from, to, subject, date, snippet, labelIds}], nextPageToken? }
    app.post('/api/email/list', apiKeyAuth, async (req: any, res: any) => {
      try {
        const { maxResults = 10, q = '', labelIds = [], pageToken } = req.body || {};
        const { fetchInboxMessages } = await import('./gmailService.js');
        const raw = await fetchInboxMessages({ maxResults: Math.min(parseInt(maxResults) || 10, 100), q, labelIds, pageToken });
        // fetchInboxMessages now returns already-decoded messages — use directly
        res.json({ success: true, messages: raw.messages || [], nextPageToken: raw.nextPageToken });
      } catch (error) {
        logToFile(`[API] /email/list error: ${error}`);
        res.status(500).json({ error: 'Failed to list emails', message: error instanceof Error ? error.message : String(error) });
      }
    });

    // POST /api/email/read — get full message (replaces users().messages().get())
    // Body: { messageId }
    // Returns: { success, message: {id, threadId, from, to, cc, subject, date, messageId, inReplyTo, body:{text,html}, attachments:[{filename,mimeType,size}], labelIds} }
    app.post('/api/email/read', apiKeyAuth, async (req: any, res: any) => {
      try {
        const { messageId } = req.body || {};
        if (!messageId) return res.status(400).json({ error: 'messageId is required' });
        const { getMessage } = await import('./gmailService.js');
        const message = await getMessage(messageId);
        res.json({ success: true, message });
      } catch (error) {
        logToFile(`[API] /email/read error: ${error}`);
        res.status(500).json({ error: 'Failed to read email', message: error instanceof Error ? error.message : String(error) });
      }
    });

    // POST /api/email/send — send or reply (replaces users().messages().send())
    // Body: { to, subject, body, from?, cc?, bcc?, html?, threadId?, inReplyTo?, attachments? }
    //   threadId  — links message into existing Gmail thread (for compliance reply tracking)
    //   inReplyTo — Message-Id header of parent (sets In-Reply-To / References headers)
    // Returns: { success, messageId, threadId }
    app.post('/api/email/send', apiKeyAuth, async (req: any, res: any) => {
      try {
        const { to, subject, body, from, cc, bcc, html, threadId, inReplyTo } = req.body || {};
        if (!to || !subject || !body) return res.status(400).json({ error: 'to, subject, body are required' });
        const { sendGmail } = await import('./gmailService.js');
        const result = await sendGmail({ to, subject, body, from, cc, bcc, html: html === true, threadId, inReplyTo });
        res.json(result);
      } catch (error) {
        logToFile(`[API] /email/send error: ${error}`);
        res.status(500).json({ error: 'Failed to send email', message: error instanceof Error ? error.message : String(error) });
      }
    });

    // POST /api/email/search — search by subject/sender/keyword (replaces users().threads().list())
    // Body: { query, maxResults? }
    //   query supports Gmail search syntax: "from:someone@gmail.com", "subject:Compliance", "has:attachment"
    // Returns: { success, messages: [{id, threadId, from, subject, date, snippet}] }
    app.post('/api/email/search', apiKeyAuth, async (req: any, res: any) => {
      try {
        const { query, maxResults = 10 } = req.body || {};
        if (!query) return res.status(400).json({ error: 'query is required' });
        const { fetchInboxMessages } = await import('./gmailService.js');
        const raw = await fetchInboxMessages({ maxResults: Math.min(parseInt(maxResults) || 10, 100), q: query, labelIds: [] });
        // fetchInboxMessages now returns already-decoded messages — use directly
        res.json({ success: true, query, messages: raw.messages || [], nextPageToken: raw.nextPageToken });
      } catch (error) {
        logToFile(`[API] /email/search error: ${error}`);
        res.status(500).json({ error: 'Failed to search emails', message: error instanceof Error ? error.message : String(error) });
      }
    });

    // POST /api/email/thread — get all replies in a thread
    // Body: { threadId }
    // Returns: { success, threadId, messageCount, messages: [{id, from, subject, date, body:{text,html}}] }
    app.post('/api/email/thread', apiKeyAuth, async (req: any, res: any) => {
      try {
        const { threadId } = req.body || {};
        if (!threadId) return res.status(400).json({ error: 'threadId is required' });
        const { getThreadReplies } = await import('./gmailService.js');
        const messages = await getThreadReplies(threadId);
        res.json({ success: true, threadId, messageCount: messages.length, messages });
      } catch (error) {
        logToFile(`[API] /email/thread error: ${error}`);
        res.status(500).json({ error: 'Failed to get thread', message: error instanceof Error ? error.message : String(error) });
      }
    });

    // --- AI/agent-centric Gmail endpoints (for MCP/AI agent use) ---
    // API Key Auth Middleware
    function apiKeyAuth(req: any, res: any, next: any) {
      const apiKey = req.headers['x-api-key'] || req.query.apiKey;
      if (!apiKey || apiKey !== process.env.API_KEY) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
      }
      next();
    }

    // Enhanced Gmail inbox: search, label, pagination (protected)
    app.get('/api/email/inbox', apiKeyAuth, async (req: any, res: any) => {
      try {
        const maxResults = req.query.maxResults ? parseInt(String(req.query.maxResults)) : 10;
        if (isNaN(maxResults) || maxResults < 1 || maxResults > 100) {
          return res.status(400).json({ error: 'maxResults must be between 1 and 100' });
        }
        const q = req.query.q ? String(req.query.q) : '';
        const labelIds = req.query.labelIds ? String(req.query.labelIds).split(',') : [];
        const pageToken = req.query.pageToken ? String(req.query.pageToken) : undefined;
        const { fetchInboxMessages } = await import('./gmailService.js');
        const result = await fetchInboxMessages({ maxResults, q, labelIds, pageToken });
        res.json({ success: true, ...result });
      } catch (error) {
        logToFile(`[SECURITY] API error fetching inbox: ${error}`);
        res.status(500).json({
          error: 'Failed to fetch inbox',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Gmail thread endpoint (protected)
    app.get('/api/email/thread/:threadId', apiKeyAuth, async (req: any, res: any) => {
      try {
        const threadId = req.params.threadId;
        if (!threadId) {
          return res.status(400).json({ error: 'Missing threadId parameter' });
        }
        const { fetchThread } = await import('./gmailService.js');
        const thread = await fetchThread(threadId);
        res.json({ success: true, thread });
      } catch (error) {
        logToFile(`API error fetching thread: ${error}`);
        res.status(500).json({
          error: 'Failed to fetch thread',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Gmail send via OAuth (protected)
    app.post('/api/email/send-gmail', apiKeyAuth, async (req: any, res: any) => {
      try {
        const { to, subject, body, from, cc, bcc, html } = req.body;
        if (!to || !subject || !body) return res.status(400).json({ error: 'Missing required fields: to, subject, body' });
        const { sendGmail } = await import('./gmailService.js');
        const result = await sendGmail({ to, subject, body, from, cc, bcc, html: html === true });
        res.json(result);
      } catch (error) {
        logToFile(`API error sending gmail: ${error}`);
        res.status(500).json({ error: 'Failed to send email', message: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    // Gmail reply (protected)
    app.post('/api/email/reply', apiKeyAuth, async (req: any, res: any) => {
      try {
        const { threadId, to, subject, body, inReplyTo } = req.body;
        if (!threadId || !to || !subject || !body || !inReplyTo) return res.status(400).json({ error: 'Missing required fields' });
        const { replyToMessage } = await import('./gmailService.js');
        const result = await replyToMessage({ threadId, to, subject, body, inReplyTo });
        res.json({ success: true, result });
      } catch (error) {
        logToFile(`API error replying: ${error}`);
        res.status(500).json({ error: 'Failed to reply', message: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    // Gmail forward (protected)
    app.post('/api/email/forward', apiKeyAuth, async (req: any, res: any) => {
      try {
        const { messageId, to, subject, body } = req.body;
        if (!messageId || !to || !subject || !body) return res.status(400).json({ error: 'Missing required fields' });
        const { forwardMessage } = await import('./gmailService.js');
        const result = await forwardMessage({ messageId, to, subject, body });
        res.json({ success: true, result });
      } catch (error) {
        logToFile(`API error forwarding: ${error}`);
        res.status(500).json({ error: 'Failed to forward', message: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    // Get single message with full decoded body (protected)
    app.get('/api/email/message/:messageId', apiKeyAuth, async (req: any, res: any) => {
      try {
        const { getMessage } = await import('./gmailService.js');
        const message = await getMessage(req.params.messageId);
        res.json({ success: true, message });
      } catch (error) {
        logToFile(`API error fetching message: ${error}`);
        res.status(500).json({ error: 'Failed to fetch message', message: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    // Get all thread replies with decoded bodies (protected)
    app.get('/api/email/thread/:threadId/replies', apiKeyAuth, async (req: any, res: any) => {
      try {
        const { getThreadReplies } = await import('./gmailService.js');
        const messages = await getThreadReplies(req.params.threadId);
        res.json({ success: true, threadId: req.params.threadId, messageCount: messages.length, messages });
      } catch (error) {
        logToFile(`API error fetching thread replies: ${error}`);
        res.status(500).json({ error: 'Failed to fetch thread replies', message: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    // Mark message as spam (protected)
    app.post('/api/email/spam', apiKeyAuth, async (req: any, res: any) => {
      try {
        const { messageId } = req.body;
        if (!messageId) return res.status(400).json({ error: 'Missing messageId' });
        const { markSpam } = await import('./gmailService.js');
        const result = await markSpam(messageId);
        res.json(result);
      } catch (error) {
        logToFile(`API error marking spam: ${error}`);
        res.status(500).json({ error: 'Failed to mark spam', message: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    // 404 handler
    app.use((req, res) => {
      res.status(404).json({ error: 'Endpoint not found' });
    });

    // Start HTTP server
    app.listen(port, () => {
      logToFile(`HTTP Server started on port ${port}`);
      console.log(`🚀 SMTP MCP Server running on port ${port}`);
      console.log(`📚 API Documentation: http://localhost:${port}/docs`);
      console.log(`🏥 Health Check: http://localhost:${port}/api/health`);
      console.log(`Press Ctrl+C to exit.`);
    });

    // Handle process termination
    process.on('SIGINT', () => {
      logToFile("Server shutting down due to SIGINT");
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      logToFile("Server shutting down due to SIGTERM");
      process.exit(0);
    });

  } catch (error) {
    logToFile(`Server failed to start: ${error}`);
    process.exit(1);
  }
}

// Run the server
runServer().catch((error) => {
  logToFile(`Server failed to start: ${error}`);
  process.exit(1);
});