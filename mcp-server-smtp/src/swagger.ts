import swaggerJsdoc from 'swagger-jsdoc';
import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Universal SMTP MCP Server API',
      version: '1.0.0',
      description: `
        A powerful and flexible SMTP MCP (Model Context Protocol) Server for AI agents and applications.
        
        ## Features
        - Send emails with templates and attachments
        - Bulk email capabilities with rate limiting
        - SMTP configuration management
        - Email template management
        - Comprehensive logging and tracking
        - Compatible with all major SMTP providers
        
        ## Authentication
        This server can operate in multiple modes:
        - **Universal Mode**: No authentication required (default)
        - **API Key Mode**: Requires API key for access
        - **Multi-user Mode**: With Supabase integration for user-specific data
        
        ## Integration with AI Agents
        This server is designed to be used by AI agents and applications through:
        - REST API endpoints
        - Model Context Protocol (MCP)
        - Direct HTTP calls
      `,
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3007/api',
        description: 'Local development server'
      },
      {
        url: 'https://your-domain.com/api',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key'
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        EmailRecipient: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com'
            },
            name: {
              type: 'string',
              example: 'John Doe'
            }
          },
          required: ['email']
        },
        SendEmailRequest: {
          type: 'object',
          properties: {
            to: {
              type: 'array',
              items: { $ref: '#/components/schemas/EmailRecipient' }
            },
            subject: {
              type: 'string',
              example: 'Hello from SMTP Server'
            },
            body: {
              type: 'string',
              example: '<h1>Hello World!</h1><p>This is a test email.</p>'
            },
            from: { $ref: '#/components/schemas/EmailRecipient' },
            cc: {
              type: 'array',
              items: { $ref: '#/components/schemas/EmailRecipient' }
            },
            bcc: {
              type: 'array',
              items: { $ref: '#/components/schemas/EmailRecipient' }
            },
            templateId: {
              type: 'string',
              example: 'welcome-template'
            },
            templateData: {
              type: 'object',
              example: { name: 'John', company: 'Acme Corp' }
            },
            smtpConfigId: {
              type: 'string',
              example: 'gmail-config'
            }
          },
          required: ['to', 'subject', 'body']
        },
        SMTPConfig: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'gmail-config'
            },
            name: {
              type: 'string',
              example: 'Gmail SMTP'
            },
            host: {
              type: 'string',
              example: 'smtp.gmail.com'
            },
            port: {
              type: 'integer',
              example: 587
            },
            secure: {
              type: 'boolean',
              example: false
            },
            auth: {
              type: 'object',
              properties: {
                user: {
                  type: 'string',
                  example: 'your-email@gmail.com'
                },
                pass: {
                  type: 'string',
                  example: 'your-app-password'
                }
              }
            },
            isDefault: {
              type: 'boolean',
              example: true
            }
          }
        },
        EmailTemplate: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'welcome-template'
            },
            name: {
              type: 'string',
              example: 'Welcome Email'
            },
            subject: {
              type: 'string',
              example: 'Welcome to {{company}}, {{name}}!'
            },
            body: {
              type: 'string',
              example: '<h1>Welcome {{name}}!</h1><p>Thanks for joining {{company}}.</p>'
            },
            isDefault: {
              type: 'boolean',
              example: false
            }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Email sent successfully'
            },
            data: {
              type: 'object'
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              example: 'Invalid email address'
            },
            details: {
              type: 'object'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Email',
        description: 'Email sending operations'
      },
      {
        name: 'SMTP Config',
        description: 'SMTP configuration management'
      },
      {
        name: 'Templates',
        description: 'Email template management'
      },
      {
        name: 'Tools',
        description: 'MCP tools and server information'
      },
      {
        name: 'Health',
        description: 'Server health and monitoring'
      }
    ]
  },
  apis: ['./src/**/*.ts', './docs/api/*.yaml']
};

const specs = swaggerJsdoc(swaggerOptions);

export function setupSwagger(app: Express) {
  const swaggerPath = process.env.SWAGGER_UI_PATH || '/docs';
  
  // Serve Swagger UI
  app.use(swaggerPath, swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info .title { color: #2563eb; }
    `,
    customSiteTitle: 'Universal SMTP MCP Server API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true
    }
  }));

  // Serve OpenAPI JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  console.log(`📚 API Documentation available at: http://localhost:${process.env.PORT || 3007}${swaggerPath}`);
  console.log(`📄 OpenAPI spec available at: http://localhost:${process.env.PORT || 3007}/api-docs.json`);
}

export { specs as swaggerSpecs };
