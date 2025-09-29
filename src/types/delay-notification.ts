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
  
  if (!notification.customerId || typeof notification.customerId !== 'string' || notification.customerId.trim().length === 0) {
    throw new Error('Customer ID must be a non-empty string');
  }
  
  if (!notification.customerEmail || typeof notification.customerEmail !== 'string') {
    throw new Error('Customer email must be a string');
  }
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(notification.customerEmail)) {
    throw new Error('Customer email must be a valid email address');
  }
  
  if (!notification.route || typeof notification.route !== 'object') {
    throw new Error('Route must be provided');
  }
  
  if (typeof notification.delayMinutes !== 'number' || notification.delayMinutes < 0) {
    throw new Error('Delay minutes must be a non-negative number');
  }
  
  if (!notification.message || typeof notification.message !== 'string' || notification.message.trim().length === 0) {
    throw new Error('Message must be a non-empty string');
  }
  
  if (notification.sentAt && !(notification.sentAt instanceof Date) && !Date.parse(notification.sentAt)) {
    throw new Error('Sent at must be a valid date if provided');
  }
  
  return true;
}