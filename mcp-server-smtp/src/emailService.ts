import nodemailer from 'nodemailer';
import { getDefaultSmtpConfig, getSmtpConfigs, SmtpServerConfig, getDefaultEmailTemplate, getEmailTemplates, EmailTemplate, logEmailActivity, EmailLogEntry } from './config.js';
import { logToFile } from "./index.js";
import * as fs from 'fs';
import * as path from 'path';

// Interface for email recipient
export interface EmailRecipient {
  email: string;
  name?: string;
}

// Interface for email data
export interface EmailData {
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  body: string;
  from?: {
    email: string;
    name?: string;
  };
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  templateId?: string;
  templateData?: Record<string, any>;
  smtpConfig?: DynamicSmtpConfig; // Dynamic SMTP configuration
  images?: Array<{
    content: string; // Base64 content
    filename: string;
    cid?: string;
  }>;
}

// Interface for bulk email data
export interface BulkEmailData {
  recipients: EmailRecipient[];
  subject: string;
  body: string;
  from?: {
    email: string;
    name?: string;
  };
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  templateId?: string;
  templateData?: Record<string, any>;
  batchSize?: number;
  delayBetweenBatches?: number; // in milliseconds
  smtpConfig?: DynamicSmtpConfig; // Dynamic SMTP configuration
}

// Rate limiting state
const rateLimitState = {
  lastSendTime: 0,
  messageCount: 0,
  resetTime: 0
};

// Interface for dynamic SMTP configuration
export interface DynamicSmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}

/**
 * Create a nodemailer transport using SMTP config
 */
export async function createTransport(smtpConfigId?: string, dynamicConfig?: DynamicSmtpConfig) {
  let smtpConfig: SmtpServerConfig | DynamicSmtpConfig;

  // Priority: 1. Dynamic config from request, 2. Stored config by ID, 3. Default config
  if (dynamicConfig) {
    smtpConfig = dynamicConfig;
    console.log('Using dynamic SMTP config from request');
  } else if (smtpConfigId) {
    const configs = await getSmtpConfigs();
    const config = configs.find(c => c.id === smtpConfigId);
    if (!config) {
      throw new Error(`SMTP configuration with ID ${smtpConfigId} not found`);
    }
    smtpConfig = config;
    console.log(`Using stored SMTP config: ${smtpConfigId}`);
  } else {
    smtpConfig = await getDefaultSmtpConfig();
    console.log('Using default SMTP config');
  }

  // Handle both formats (stored config vs dynamic config)
  const transportConfig = {
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: {
      user: 'auth' in smtpConfig ? smtpConfig.auth.user : smtpConfig.user,
      pass: 'auth' in smtpConfig ? smtpConfig.auth.pass : smtpConfig.pass
    }
  };

  console.log(`Creating transport for: ${transportConfig.host}:${transportConfig.port}`);
  return nodemailer.createTransport(transportConfig);
}

/**
 * Replace template variables with actual values
 */
function processTemplate(template: string, data: Record<string, any> = {}): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const value = data[key.trim()];
    return value !== undefined ? value : match;
  });
}

/**
 * Generate email content from template
 */
async function generateEmailContent(
  templateId: string | undefined,
  templateData: Record<string, any> | undefined,
  subject: string,
  body: string
): Promise<{ subject: string; body: string }> {
  // If no template ID is provided, use the provided subject and body
  if (!templateId) {
    return { subject, body };
  }

  // Get templates
  const templates = await getEmailTemplates();
  let template: EmailTemplate | undefined;

  if (templateId === 'default') {
    template = await getDefaultEmailTemplate();
  } else {
    template = templates.find(t => t.id === templateId);
  }

  // If template not found, use the provided subject and body
  if (!template) {
    console.warn(`Template with ID ${templateId} not found. Using provided subject and body.`);
    return { subject, body };
  }

  // Process template
  const processedSubject = processTemplate(template.subject, templateData);
  const processedBody = processTemplate(template.body, templateData);

  return {
    subject: processedSubject,
    body: processedBody
  };
}

/**
 * Format recipients for nodemailer
 */
function formatRecipient(recipient: EmailRecipient): string {
  if (recipient.name) {
    return `"${recipient.name}" <${recipient.email}>`;
  }
  return recipient.email;
}

/**
 * Format recipients array for nodemailer
 */
function formatRecipients(recipients: EmailRecipient | EmailRecipient[]): string | string[] {
  if (Array.isArray(recipients)) {
    return recipients.map(formatRecipient);
  }
  return formatRecipient(recipients);
}

/**
 * Handle image saving and body replacement
 */
async function saveAndProcessImages(body: string, images?: EmailData['images']): Promise<string> {
  if (!images || images.length === 0) return body;

  let newBody = body;
  const uploadDir = path.join(process.cwd(), 'public', 'images');

  // Ensure directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Get Base URL (default to localhost if not set)
  const port = process.env.PORT || '3007';
  const protocol = process.env.PROTOCOL || 'http';
  const host = process.env.HOST || 'localhost';
  const baseUrl = process.env.BASE_URL || `${protocol}://${host}:${port}`;

  for (const image of images) {
    try {
      if (!image.content || !image.filename) continue;

      // Create unique filename to prevent overwrites
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(image.filename);
      const newFilename = 'img-' + uniqueSuffix + ext;
      const filePath = path.join(uploadDir, newFilename);

      // Write file (handle base64)
      const buffer = Buffer.from(image.content, 'base64');
      fs.writeFileSync(filePath, buffer);

      const imageUrl = `${baseUrl}/public/images/${newFilename}`;
      logToFile(`Saved image ${image.filename} to ${imageUrl}`);

      // Replace in body
      // We look for src="filename" or src='filename'
      // We escape the filename for regex
      const escapedFilename = image.filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Regex to match src="filename" or src='filename'
      const regex = new RegExp(`src=["']${escapedFilename}["']`, 'g');

      // Check if we find matches
      if (regex.test(newBody)) {
        newBody = newBody.replace(regex, `src="${imageUrl}"`);
      } else {
        // Fallback: If not found in src, maybe just append it? 
        // For now, we only replace if referenced. 
        // If the user didn't put it in the HTML, they might expect it as attachment, 
        // but this feature request specifically asked for "uploading images... so recipient sees full email and images"
        // implying inline display.
      }
    } catch (err) {
      logToFile(`Error processing image ${image.filename}: ${err}`);
    }
  }

  return newBody;
}

/**
 * Send an email
 */
export async function sendEmail(data: EmailData, smtpConfigId?: string): Promise<{ success: boolean; message?: string }> {
  try {
    // Use dynamic config from request if provided, otherwise use stored config
    const transport = await createTransport(smtpConfigId, data.smtpConfig);

    let smtpConfig: SmtpServerConfig | DynamicSmtpConfig;
    if (data.smtpConfig) {
      smtpConfig = data.smtpConfig;
    } else if (smtpConfigId) {
      const configs = await getSmtpConfigs();
      const config = configs.find(c => c.id === smtpConfigId);
      if (!config) {
        return { success: false, message: 'SMTP configuration not found' };
      }
      smtpConfig = config;
    } else {
      smtpConfig = await getDefaultSmtpConfig();
    }

    if (!smtpConfig) {
      return { success: false, message: 'SMTP configuration not found' };
    }

    // Generate email content from template if templateId is provided
    let { subject, body } = await generateEmailContent(
      data.templateId,
      data.templateData,
      data.subject,
      data.body
    );

    // Process images and update body
    if (data.images && data.images.length > 0) {
      body = await saveAndProcessImages(body, data.images);
    }

    // Get the default from email
    const defaultFrom = 'auth' in smtpConfig ? smtpConfig.auth.user : smtpConfig.user;

    // Create mail options
    const mailOptions = {
      from: data.from
        ? (data.from.name ? `"${data.from.name}" <${data.from.email}>` : data.from.email)
        : defaultFrom,
      to: formatRecipients(data.to),
      subject,
      html: body,
      cc: data.cc ? formatRecipients(data.cc) : undefined,
      bcc: data.bcc ? formatRecipients(data.bcc) : undefined
    };

    // Send email
    const info = await transport.sendMail(mailOptions);

    // Log email activity
    const recipients = Array.isArray(data.to) ? data.to : [data.to];
    for (const recipient of recipients) {
      const configId = 'id' in smtpConfig ? smtpConfig.id : 'dynamic';
      const logEntry: EmailLogEntry = {
        timestamp: new Date().toISOString(),
        smtpConfig: configId,
        templateId: data.templateId,
        recipient: recipient.email,
        subject,
        success: true,
        message: `Message sent: ${info.messageId}`
      };
      await logEmailActivity(logEntry);
    }

    return { success: true, message: `Message sent: ${info.messageId}` };
  } catch (error) {
    logToFile(`Error sending email: ${error}`);

    // Log failed email activity
    if (data.to) {
      const recipients = Array.isArray(data.to) ? data.to : [data.to];
      for (const recipient of recipients) {
        const logEntry: EmailLogEntry = {
          timestamp: new Date().toISOString(),
          smtpConfig: smtpConfigId || 'unknown',
          templateId: data.templateId,
          recipient: recipient.email,
          subject: data.subject,
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error sending email'
        };
        await logEmailActivity(logEntry);
      }
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error sending email'
    };
  }
}

/**
 * Send emails in bulk to multiple recipients
 */
export async function sendBulkEmails(data: BulkEmailData, smtpConfigId?: string): Promise<{
  success: boolean;
  totalSent: number;
  totalFailed: number;
  failures?: { email: string; error: string }[];
  message?: string;
}> {
  try {
    const { recipients, batchSize = 10, delayBetweenBatches = 1000 } = data;

    if (!recipients || recipients.length === 0) {
      return {
        success: false,
        totalSent: 0,
        totalFailed: 0,
        message: 'No recipients provided'
      };
    }

    const failures: { email: string; error: string }[] = [];
    let totalSent = 0;

    // Process recipients in batches
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      // Send emails to the batch (one by one to allow for individual template processing)
      const promises = batch.map(async (recipient) => {
        try {
          // Create email data for single recipient using the bulk data
          const emailData: EmailData = {
            to: recipient,
            subject: data.subject,
            body: data.body,
            from: data.from,
            cc: data.cc,
            bcc: data.bcc,
            templateId: data.templateId,
            templateData: {
              ...data.templateData,
              email: recipient.email,
              name: recipient.name || ''
            },
            smtpConfig: data.smtpConfig // Pass dynamic SMTP config
          };

          const result = await sendEmail(emailData, smtpConfigId);

          if (result.success) {
            totalSent++;
            return { success: true };
          } else {
            failures.push({ email: recipient.email, error: result.message || 'Unknown error' });
            return { success: false, error: result.message };
          }
        } catch (error) {
          failures.push({
            email: recipient.email,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          return { success: false, error };
        }
      });

      await Promise.all(promises);

      // If not the last batch, wait before processing the next batch
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

    return {
      success: totalSent > 0,
      totalSent,
      totalFailed: failures.length,
      failures: failures.length > 0 ? failures : undefined,
      message: `Successfully sent ${totalSent} out of ${recipients.length} emails`
    };
  } catch (error) {
    logToFile(`Error sending bulk emails: ${error}`);
    return {
      success: false,
      totalSent: 0,
      totalFailed: data.recipients.length,
      message: error instanceof Error ? error.message : 'Unknown error sending bulk emails'
    };
  }
} 