import sgMail from '@sendgrid/mail';
import { DelayNotification, SendGridResponse, validateDelayNotification } from '../types/delay-notification';
import { NotificationActivity } from '../types/activity-interfaces';

/**
 * SendGrid email notification activity implementation
 * Handles sending delay notifications to customers via email
 */
export class SendGridNotificationActivity implements NotificationActivity {
  private apiKey: string;
  private fromEmail: string;
  private fromName: string;

  constructor(apiKey?: string, fromEmail?: string, fromName?: string) {
    this.apiKey = apiKey || process.env.SENDGRID_API_KEY || '';
    this.fromEmail = fromEmail || process.env.FROM_EMAIL || 'noreply@freightmonitor.com';
    this.fromName = fromName || process.env.FROM_NAME || 'Freight Delay Monitor';
    
    if (!this.apiKey) {
      throw new Error('SendGrid API key is required');
    }
    
    sgMail.setApiKey(this.apiKey);
  }

  /**
   * Sends email notification to customer about delivery delay
   * @param notification - Complete notification data including message
   * @returns Promise resolving to true if sent successfully, false otherwise
   * @throws Error if notification cannot be sent after retries
   */
  async sendEmailNotification(notification: DelayNotification): Promise<boolean> {
    try {
      // Validate notification data
      validateDelayNotification(notification);
      
      console.log(`[NotificationActivity] Preparing to send email notification to ${notification.customerEmail} for route ${notification.route.routeId}`);
      
      // Create HTML email template
      const htmlContent = this.generateEmailTemplate(notification);
      
      // Prepare SendGrid email payload
      const emailData = {
        to: {
          email: notification.customerEmail,
          name: `Customer ${notification.customerId}`
        },
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        subject: `Delivery Delay Update - Route ${notification.route.routeId}`,
        html: htmlContent,
        text: this.generatePlainTextContent(notification)
      };

      console.log(`[NotificationActivity] Sending email via SendGrid API to ${notification.customerEmail}`);
      
      // Send email using SendGrid
      const response = await sgMail.send(emailData);
      
      // Log successful delivery
      const messageId = response[0]?.headers?.['x-message-id'] || 'unknown';
      console.log(`[NotificationActivity] Email sent successfully. Message ID: ${messageId}, Status: ${response[0]?.statusCode}`);
      
      // Update notification with sent timestamp
      notification.sentAt = new Date();
      
      return true;
      
    } catch (error) {
      console.error(`[NotificationActivity] Failed to send email notification:`, error);
      
      // Check if it's a retryable error
      if (this.isRetryableError(error)) {
        const errorMessage = error instanceof Error ? error.message : (error.message || 'Unknown error');
        throw new Error(`Retryable email sending error: ${errorMessage}`);
      } else {
        // Non-retryable error - log and return false
        console.error(`[NotificationActivity] Non-retryable error occurred. Email not sent.`);
        return false;
      }
    }
  }

  /**
   * Generates HTML email template with delay information and professional formatting
   * @param notification - Delay notification data
   * @returns HTML string for email content
   */
  private generateEmailTemplate(notification: DelayNotification): string {
    const { route, delayMinutes, message } = notification;
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Delivery Delay Update</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #007bff;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #007bff;
            margin: 0;
            font-size: 24px;
        }
        .delay-info {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
        }
        .delay-time {
            font-size: 18px;
            font-weight: bold;
            color: #856404;
        }
        .route-details {
            background-color: #f8f9fa;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
        }
        .route-details h3 {
            margin-top: 0;
            color: #495057;
        }
        .message-content {
            background-color: #e7f3ff;
            border-left: 4px solid #007bff;
            padding: 15px;
            margin: 20px 0;
            font-style: italic;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            color: #6c757d;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚚 Delivery Delay Update</h1>
        </div>
        
        <div class="delay-info">
            <div class="delay-time">Estimated Delay: ${delayMinutes} minutes</div>
        </div>
        
        <div class="route-details">
            <h3>Route Information</h3>
            <p><strong>Route ID:</strong> ${route.routeId}</p>
            <p><strong>From:</strong> ${route.origin}</p>
            <p><strong>To:</strong> ${route.destination}</p>
            <p><strong>Baseline Time:</strong> ${route.baselineTimeMinutes} minutes</p>
        </div>
        
        <div class="message-content">
            ${message}
        </div>
        
        <div class="footer">
            <p>This is an automated notification from Freight Delay Monitor</p>
            <p>Sent on ${new Date().toLocaleString()}</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generates plain text version of the email content
   * @param notification - Delay notification data
   * @returns Plain text string for email content
   */
  private generatePlainTextContent(notification: DelayNotification): string {
    const { route, delayMinutes, message } = notification;
    
    return `
DELIVERY DELAY UPDATE

Estimated Delay: ${delayMinutes} minutes

Route Information:
- Route ID: ${route.routeId}
- From: ${route.origin}
- To: ${route.destination}
- Baseline Time: ${route.baselineTimeMinutes} minutes

Message:
${message}

---
This is an automated notification from Freight Delay Monitor
Sent on ${new Date().toLocaleString()}
`;
  }

  /**
   * Determines if an error is retryable based on error type and status codes
   * @param error - The error that occurred
   * @returns true if error should be retried, false otherwise
   */
  private isRetryableError(error: any): boolean {
    // Validation errors are not retryable
    if (error.message?.includes('Customer ID must be') || 
        error.message?.includes('Customer email must be') ||
        error.message?.includes('Route must be') ||
        error.message?.includes('Delay minutes must be') ||
        error.message?.includes('Message must be') ||
        error.message?.includes('Sent at must be')) {
      return false;
    }
    
    // Network errors and timeouts are retryable
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      return true;
    }
    
    // SendGrid specific errors
    if (error.response?.status) {
      const status = error.response.status;
      // Retry on server errors (5xx) and rate limiting (429)
      if (status >= 500 || status === 429) {
        return true;
      }
      // Don't retry on client errors (4xx) except rate limiting
      if (status >= 400 && status < 500 && status !== 429) {
        return false;
      }
    }
    
    // Authentication errors are not retryable
    if (error.message?.includes('authentication') || error.message?.includes('unauthorized')) {
      return false;
    }
    
    // Invalid email format errors are not retryable
    if (error.message?.includes('invalid email') || error.message?.includes('malformed')) {
      return false;
    }
    
    // Default to retryable for unknown errors
    return true;
  }
}

/**
 * Factory function to create notification activity instance
 * @param apiKey - SendGrid API key (optional, will use environment variable)
 * @param fromEmail - Sender email address (optional, will use environment variable)
 * @param fromName - Sender name (optional, will use environment variable)
 * @returns NotificationActivity instance
 */
export function createNotificationActivity(
  apiKey?: string, 
  fromEmail?: string, 
  fromName?: string
): NotificationActivity {
  return new SendGridNotificationActivity(apiKey, fromEmail, fromName);
}

// Export the activity implementation for Temporal worker registration
// Note: This will be instantiated with proper configuration in the worker
export const notificationActivity = {
  sendEmailNotification: async (notification: DelayNotification): Promise<boolean> => {
    const activity = new SendGridNotificationActivity();
    return activity.sendEmailNotification(notification);
  }
};