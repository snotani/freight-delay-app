import { DeliveryRoute } from './delivery-route';

/**
 * Represents a delay notification to be sent to a customer
 */
export interface DelayNotification {
  /** Unique identifier for the customer */
  customerId: string;
  /** Customer's email address for notification */
  customerEmail: string;
  /** The delivery route experiencing delays */
  route: DeliveryRoute;
  /** Amount of delay in minutes */
  delayMinutes: number;
  /** Generated message content for the notification */
  message: string;
  /** Timestamp when notification was sent (optional) */
  sentAt?: Date;
}

/**
 * OpenAI Chat Completions API response structure
 */
export interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * SendGrid Email API response structure
 */
export interface SendGridResponse {
  statusCode: number;
  body: unknown;
  headers: Record<string, string>;
}

/**
 * SendGrid email request payload structure
 */
export interface SendGridEmailRequest {
  personalizations: Array<{
    to: Array<{
      email: string;
      name?: string;
    }>;
    subject: string;
  }>;
  from: {
    email: string;
    name?: string;
  };
  content: Array<{
    type: string;
    value: string;
  }>;
}

/**
 * Input validation function for DelayNotification data
 * @param notification - The notification data to validate
 * @returns true if valid, throws error if invalid
 */
export function validateDelayNotification(notification: unknown): notification is DelayNotification {
  if (!notification || typeof notification !== 'object') {
    throw new Error('Notification must be an object');
  }
  
  const notif = notification as any;
  
  if (!notif.customerId || typeof notif.customerId !== 'string' || notif.customerId.trim().length === 0) {
    throw new Error('Customer ID must be a non-empty string');
  }
  
  if (!notif.customerEmail || typeof notif.customerEmail !== 'string') {
    throw new Error('Customer email must be a string');
  }
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(notif.customerEmail)) {
    throw new Error('Customer email must be a valid email address');
  }
  
  if (!notif.route || typeof notif.route !== 'object') {
    throw new Error('Route must be provided');
  }
  
  if (typeof notif.delayMinutes !== 'number' || notif.delayMinutes < 0) {
    throw new Error('Delay minutes must be a non-negative number');
  }
  
  if (!notif.message || typeof notif.message !== 'string' || notif.message.trim().length === 0) {
    throw new Error('Message must be a non-empty string');
  }
  
  if (notif.sentAt && !(notif.sentAt instanceof Date) && !Date.parse(notif.sentAt)) {
    throw new Error('Sent at must be a valid date if provided');
  }
  
  return true;
}