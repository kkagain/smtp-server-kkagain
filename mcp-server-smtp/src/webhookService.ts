import fetch from 'node-fetch';
import { getDatabaseManager } from './database.js';
import { logToFile } from './index.js';

export class WebhookService {
    private dbManager = getDatabaseManager();

    /**
     * Trigger webhooks for a specific event
     */
    async triggerWebhooks(eventType: string, payload: any, userId?: string): Promise<void> {
        try {
            // Get active webhooks for this event
            const webhooks = await this.dbManager.getWebhooksByEvent(eventType, userId);

            if (webhooks.length === 0) {
                return;
            }

            logToFile(`Triggering ${webhooks.length} webhooks for event: ${eventType}`);

            // Fire webhooks asynchronously
            webhooks.forEach(webhook => {
                this.sendWebhook(webhook, eventType, payload).catch(err => {
                    logToFile(`Failed to trigger webhook ${webhook.id}: ${err}`);
                });
            });

        } catch (error) {
            logToFile(`Error triggering webhooks: ${error}`);
        }
    }

    /**
     * Send a single webhook request
     */
    private async sendWebhook(webhook: any, eventType: string, payload: any): Promise<void> {
        const startTime = Date.now();
        let success = false;
        let responseStatus;
        let responseBody;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), (webhook.timeoutSeconds || 30) * 1000);

        try {
            const response = await fetch(webhook.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Event': eventType,
                    'X-Webhook-ID': webhook.id,
                    // Add signature header if secret exists
                    ...(webhook.secret ? { 'X-Webhook-Signature': this.signPayload(payload, webhook.secret) } : {})
                },
                body: JSON.stringify({
                    id: Date.now().toString(), // Unique event ID
                    event: eventType,
                    created_at: new Date().toISOString(),
                    data: payload
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            responseStatus = response.status;
            success = response.ok;

            // Try to read body but don't fail if empty
            try {
                responseBody = await response.text();
                // Truncate if too long
                if (responseBody.length > 1000) {
                    responseBody = responseBody.substring(0, 1000) + '...';
                }
            } catch (e) {
                responseBody = '';
            }

        } catch (error) {
            success = false;
            responseBody = error instanceof Error ? error.message : String(error);
        } finally {
            const responseTimeMs = Date.now() - startTime;

            // Log delivery attempt
            await this.dbManager.logWebhookDelivery({
                webhookId: webhook.id,
                eventType,
                payload,
                responseStatus,
                responseBody,
                responseTimeMs,
                success
            });

            if (success) {
                logToFile(`Webhook ${webhook.id} delivered successfully in ${responseTimeMs}ms`);
            } else {
                logToFile(`Webhook ${webhook.id} delivery failed: ${responseStatus || 'Network Error'}`);
            }
        }
    }

    /**
     * Simple HMAC signature (placeholder)
     */
    private signPayload(payload: any, secret: string): string {
        // In a real app, use crypto.createHmac
        // import crypto from 'crypto';
        // return crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
        return 'signature_placeholder';
    }
}

// Export singleton
let webhookService: WebhookService | null = null;

export function getWebhookService(): WebhookService {
    if (!webhookService) {
        webhookService = new WebhookService();
    }
    return webhookService;
}
