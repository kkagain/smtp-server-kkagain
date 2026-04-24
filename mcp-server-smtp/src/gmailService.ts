// Fetch all attachments for a given messageId
export async function getAttachments(messageId: string) {
  const gmail = getGmailClient();
  const msg = await gmail.users.messages.get({ userId: 'me', id: messageId });
  const parts = msg.data.payload?.parts || [];
  const attachments = [];
  for (const part of parts) {
    if (part.filename && part.body && part.body.attachmentId) {
      const att = await gmail.users.messages.attachments.get({
        userId: 'me',
        messageId,
        id: part.body.attachmentId,
      });
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType,
        size: part.body.size,
        data: att.data.data,
      });
    }
  }
  return attachments;
}

// Fetch a thread by threadId
export async function fetchThread(threadId: string) {
  const gmail = getGmailClient();
  const thread = await gmail.users.threads.get({ userId: 'me', id: threadId });
  return thread.data;
}
import fetch from 'node-fetch';
import { logToFile } from './index.js';
import { google } from 'googleapis';
import fs from 'fs';

function getGmailClient() {
  const credentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_CREDENTIALS_PATH || 'credentials.json', 'utf8'));
  const { client_id, client_secret, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  const token = JSON.parse(fs.readFileSync(process.env.GOOGLE_TOKEN_PATH || 'token.json', 'utf8'));
  oAuth2Client.setCredentials(token);
  return google.gmail({ version: 'v1', auth: oAuth2Client });
}


// --- AI/Agent-centric features ---
// In-memory registry for webhooks (for demo; use DB in production)
const webhookRegistry: { url: string; eventTypes: string[] }[] = [];

/**
 * Summarize a thread or message (simple version, no OpenAI call)
 */
export async function summarizeEmail(id: string, type: 'thread' | 'message'): Promise<string> {
  try {
    const gmail = getGmailClient();
    let text = '';
    if (type === 'thread') {
      const thread = await gmail.users.threads.get({ userId: 'me', id });
      text = thread.data.messages?.map((m: any) => m.snippet).join('\n') || '';
    } else {
      const msg = await gmail.users.messages.get({ userId: 'me', id });
      text = msg.data.snippet || '';
    }
    // Fallback: simple snippet summary
    return text.length > 256 ? text.slice(0, 256) + '...' : text;
  } catch (error) {
    logToFile(`[SECURITY] Summarization error: ${error}`);
    throw error;
  }
}

/**
 * Register a webhook for email events (AI/agent integration)
 */
export async function registerWebhook(url: string, eventTypes: string[]): Promise<void> {
  webhookRegistry.push({ url, eventTypes });
  logToFile(`[INFO] Registered webhook: ${url} for events: ${eventTypes.join(',')}`);
}

/**
 * Call webhooks on new email events (to be called from relevant places)
 */
async function triggerWebhooks(eventType: string, payload: any) {
  for (const wh of webhookRegistry) {
    if (wh.eventTypes.includes(eventType)) {
      try {
        await fetch(wh.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventType, payload }),
        });
      } catch (err) {
        logToFile(`[SECURITY] Webhook call failed: ${err}`);
      }
    }
  }
}


// --- Utility: Create raw email for Gmail API ---
function createRawEmail({
  to, subject, body, inReplyTo, from, cc, bcc, html
}: {
  to: string; subject: string; body: string;
  inReplyTo?: string; from?: string; cc?: string; bcc?: string; html?: boolean;
}) {
  const contentType = html ? 'text/html' : 'text/plain';
  let headers = '';
  if (from) headers += `From: ${from}\r\n`;
  headers += `To: ${to}\r\n`;
  if (cc) headers += `Cc: ${cc}\r\n`;
  if (bcc) headers += `Bcc: ${bcc}\r\n`;
  headers += `Subject: ${subject}\r\nContent-Type: ${contentType}; charset=utf-8\r\n`;
  if (inReplyTo) headers += `In-Reply-To: ${inReplyTo}\r\nReferences: ${inReplyTo}\r\n`;
  const message = headers + `\r\n${body}`;
  return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Compose and send a brand-new email via Gmail API (OAuth)
export async function sendGmail({
  to, subject, body, from, cc, bcc, html = false, threadId, inReplyTo
}: {
  to: string; subject: string; body: string;
  from?: string; cc?: string; bcc?: string; html?: boolean;
  threadId?: string;   // pass to link reply into existing thread
  inReplyTo?: string;  // Message-Id header of parent message
}) {
  try {
    if (!to || !subject || !body) throw new Error('Missing required fields: to, subject, body');
    const gmail = await getGmailClient();
    const raw = createRawEmail({ to, subject, body, from, cc, bcc, html, inReplyTo });
    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw, ...(threadId ? { threadId } : {}) },
    });
    return { success: true, messageId: result.data.id, threadId: result.data.threadId };
  } catch (error) {
    logToFile(`[SECURITY] Gmail API error (sendGmail): ${error}`);
    throw error;
  }
}


// Enhanced inbox fetch: supports search, label, pagination
export async function fetchInboxMessages({
  maxResults = 10,
  q = '',
  labelIds = [],
  pageToken = undefined
}: {
  maxResults?: number,
  q?: string,
  labelIds?: string[],
  pageToken?: string
} = {}) {
  const gmail = getGmailClient();
  const res = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    q,
    labelIds,
    pageToken
  });
  const messages = res.data.messages || [];
  const fullMessages = [];
  for (const msg of messages) {
    const msgRes = await gmail.users.messages.get({ userId: 'me', id: msg.id!, format: 'full' });
    const m = msgRes.data;
    const headers = m.payload?.headers || [];
    const hdr = (name: string) => headers.find((h: any) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
    const body = extractBody(m.payload);
    fullMessages.push({
      id: m.id,
      threadId: m.threadId,
      labelIds: m.labelIds,
      snippet: m.snippet,
      from: hdr('From'),
      to: hdr('To'),
      subject: hdr('Subject'),
      date: hdr('Date'),
      messageId: hdr('Message-Id'),
      inReplyTo: hdr('In-Reply-To'),
      body,
    });
  }
  return {
    messages: fullMessages,
    nextPageToken: res.data.nextPageToken
  };
}

// Mark a message as read/unread/starred/archived
export async function modifyMessage(messageId: string, actions: {
  read?: boolean,
  starred?: boolean,
  archived?: boolean,
  deleted?: boolean
}) {
  try {
    if (!messageId || typeof messageId !== 'string') throw new Error('Invalid messageId');
    if (typeof actions !== 'object' || !actions) throw new Error('Invalid actions object');
    const allowed = ['read', 'starred', 'archived', 'deleted'];
    for (const key of Object.keys(actions)) {
      if (!allowed.includes(key)) throw new Error(`Invalid action: ${key}`);
    }
    const gmail = await getGmailClient();
    const labelsToAdd: string[] = [];
    const labelsToRemove: string[] = [];
    if (actions.read !== undefined) {
      if (actions.read) {
        labelsToRemove.push('UNREAD');
      } else {
        labelsToAdd.push('UNREAD');
      }
    }
    if (actions.starred !== undefined) {
      if (actions.starred) {
        labelsToAdd.push('STARRED');
      } else {
        labelsToRemove.push('STARRED');
      }
    }
    if (actions.archived !== undefined) {
      if (actions.archived) {
        labelsToAdd.push('ARCHIVE');
      } else {
        labelsToRemove.push('ARCHIVE');
      }
    }
    if (actions.deleted !== undefined) {
      if (actions.deleted) {
        labelsToAdd.push('TRASH');
      } else {
        labelsToRemove.push('TRASH');
      }
    }
    const result = await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        addLabelIds: labelsToAdd,
        removeLabelIds: labelsToRemove,
      },
    });
    return result.data;
  } catch (error) {
    logToFile(`[SECURITY] Gmail API error (modifyMessage): ${error}`);
    throw error;
  }
}

// Reply to a message (simple plain text)
export async function replyToMessage({ threadId, to, subject, body, inReplyTo }: { threadId: string, to: string, subject: string, body: string, inReplyTo: string }) {
  try {
    if (!threadId || !to || !subject || !body || !inReplyTo) {
      throw new Error('Missing required fields: threadId, to, subject, body, inReplyTo');
    }
    const gmail = await getGmailClient();
    const raw = createRawEmail({ to, subject, body, inReplyTo });
    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        threadId,
        raw,
      },
    });
    return result.data;
  } catch (error) {
    logToFile(`[SECURITY] Gmail API error (replyToMessage): ${error}`);
    throw error;
  }
}

// Forward a message
export async function forwardMessage({ messageId, to, subject, body }: { messageId: string, to: string, subject: string, body: string }) {
  try {
    if (!messageId || !to || !subject || !body) {
      throw new Error('Missing required fields: messageId, to, subject, body');
    }
    const gmail = await getGmailClient();
    const raw = createRawEmail({ to, subject, body });
    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw,
      },
    });
    return result.data;
  } catch (error) {
    logToFile(`[SECURITY] Gmail API error (forwardMessage): ${error}`);
    throw error;
  }
}

// --- Helper: decode base64url body data to plain string ---
function decodeBody(data?: string): string {
  if (!data) return '';
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

// --- Helper: extract plain text + html body from message payload ---
function extractBody(payload: any): { text: string; html: string } {
  if (!payload) return { text: '', html: '' };
  // Single-part message
  if (payload.mimeType === 'text/plain') return { text: decodeBody(payload.body?.data), html: '' };
  if (payload.mimeType === 'text/html') return { text: '', html: decodeBody(payload.body?.data) };
  // Multipart: recurse parts
  const parts: any[] = payload.parts || [];
  let text = '', html = '';
  for (const part of parts) {
    if (part.mimeType === 'text/plain') text = decodeBody(part.body?.data);
    else if (part.mimeType === 'text/html') html = decodeBody(part.body?.data);
    else if (part.mimeType?.startsWith('multipart/')) {
      const sub = extractBody(part);
      if (!text) text = sub.text;
      if (!html) html = sub.html;
    }
  }
  return { text, html };
}

// --- Helper: extract header value ---
function header(headers: any[], name: string): string {
  return headers?.find((h: any) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
}

// Fetch a single message by ID with fully decoded body
export async function getMessage(messageId: string) {
  const gmail = getGmailClient();
  const res = await gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' });
  const msg = res.data;
  const headers = msg.payload?.headers || [];
  const body = extractBody(msg.payload);
  // List attachment metadata (no download)
  const parts = msg.payload?.parts || [];
  const attachments = parts
    .filter((p: any) => p.filename && p.body?.attachmentId)
    .map((p: any) => ({ filename: p.filename, mimeType: p.mimeType, size: p.body?.size, attachmentId: p.body?.attachmentId }));
  return {
    id: msg.id,
    threadId: msg.threadId,
    labelIds: msg.labelIds,
    snippet: msg.snippet,
    from: header(headers, 'From'),
    to: header(headers, 'To'),
    cc: header(headers, 'Cc'),
    subject: header(headers, 'Subject'),
    date: header(headers, 'Date'),
    messageId: header(headers, 'Message-Id'),
    inReplyTo: header(headers, 'In-Reply-To'),
    body,
    attachments,
  };
}

// Fetch all replies in a thread — returns clean parsed messages
export async function getThreadReplies(threadId: string) {
  const gmail = getGmailClient();
  const res = await gmail.users.threads.get({ userId: 'me', id: threadId, format: 'full' });
  const messages = res.data.messages || [];
  return messages.map((msg: any) => {
    const headers = msg.payload?.headers || [];
    const body = extractBody(msg.payload);
    return {
      id: msg.id,
      threadId: msg.threadId,
      labelIds: msg.labelIds,
      snippet: msg.snippet,
      from: header(headers, 'From'),
      to: header(headers, 'To'),
      subject: header(headers, 'Subject'),
      date: header(headers, 'Date'),
      messageId: header(headers, 'Message-Id'),
      inReplyTo: header(headers, 'In-Reply-To'),
      body,
    };
  });
}

// Mark a message as spam
export async function markSpam(messageId: string) {
  const gmail = getGmailClient();
  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: { addLabelIds: ['SPAM'], removeLabelIds: ['INBOX'] },
  });
  return { success: true, messageId };
}
