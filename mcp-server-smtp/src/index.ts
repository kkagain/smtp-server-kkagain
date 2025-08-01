import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
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
  handleGetEmailLogs
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

// Load environment variables
dotenv.config();

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
    const port = parseInt(process.env.PORT || '3007');
    
    // Middleware
    app.use(cors());
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Setup Swagger documentation
    setupSwagger(app);

    // API routes with error handling wrapper
    const asyncHandler = (fn: (req: any, res: any) => Promise<any>) => (req: any, res: any) => {
      Promise.resolve(fn(req, res)).catch((error) => {
        logToFile(`API Error: ${error}`);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
      });
    };

    // API Routes
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

    // Root redirect to docs
    app.get('/', (req, res) => {
      res.redirect('/docs');
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