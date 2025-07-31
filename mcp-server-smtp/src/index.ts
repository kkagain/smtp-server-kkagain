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
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as http from 'http';

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

    // Create transport and connect for stdio
    const transport = new StdioServerTransport();
    await server.connect(transport);

    logToFile("SMTP MCP Server (stdio) started successfully");
    
    // Create an HTTP server to expose the API
    const port = process.env.PORT || 3007;
    const httpServer = http.createServer(async (req, res) => {
      try {
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        const urlParts = req.url?.split('/').filter(p => p) || [];
        const toolName = urlParts[1];

        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const params = body ? JSON.parse(body) : {};
            let result;

            switch (toolName) {
              case 'send-email':
                result = await handleSendEmail(params);
                break;
              case 'send-bulk-emails':
                result = await handleSendBulkEmails(params);
                break;
              case 'get-smtp-configs':
                result = await handleGetSmtpConfigs();
                break;
              case 'add-smtp-config':
                result = await handleAddSmtpConfig(params);
                break;
              case 'update-smtp-config':
                result = await handleUpdateSmtpConfig(params);
                break;
              case 'delete-smtp-config':
                result = await handleDeleteSmtpConfig(params);
                break;
              case 'get-email-templates':
                result = await handleGetEmailTemplates();
                break;
              case 'add-email-template':
                result = await handleAddEmailTemplate(params);
                break;
              case 'update-email-template':
                result = await handleUpdateEmailTemplate(params);
                break;
              case 'delete-email-template':
                result = await handleDeleteEmailTemplate(params);
                break;
              case 'get-email-logs':
                result = await handleGetEmailLogs(params);
                break;
              case 'list-tools':
                result = { tools: Object.values(TOOLS) };
                break;
              default:
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Tool not found' }));
                return;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
          } catch (error) {
            logToFile(`Error handling tool call: ${error}`);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal Server Error' }));
          }
        });
      } catch (error) {
        logToFile(`Error processing request: ${error}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      }
    });

    httpServer.listen(port, () => {
      logToFile(`HTTP Server started on port ${port}`);
      console.log(`SMTP MCP Server running on port ${port}. Press Ctrl+C to exit.`);
    });
    
    // Handle process termination
    process.on('SIGINT', () => {
      logToFile("Server shutting down due to SIGINT");
      httpServer.close();
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      logToFile("Server shutting down due to SIGTERM");
      httpServer.close();
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