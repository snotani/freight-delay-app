import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import sgMail from '@sendgrid/mail';
import { SendGridNotificationActivity, createNotificationActivity } from './notification-activity';
import { DelayNotification } from '../types/delay-notification';
import { DeliveryRoute } from '../types/delivery-route';

// Mock SendGrid
vi.mock('@sendgrid/mail', () => ({
  default: {
    setApiKey: vi.fn(),
    send: vi.fn()
  }
}));

describe('SendGridNotificationActivity', () => {
  let activity: SendGridNotificationActivity;
  let mockSend: any;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  const mockRoute: DeliveryRoute = {
    routeId: 'ROUTE-123',
    origin: '123 Main St, City A',
    destination: '456 Oak Ave, City B',
    baselineTimeMinutes: 45
  };

  const mockNotification: DelayNotification = {
    customerId: 'CUST-456',
    customerEmail: 'customer@example.com',
    route: mockRoute,
    delayMinutes: 35,
    message: 'We apologize for the delay in your delivery due to heavy traffic conditions.'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSend = vi.mocked(sgMail.send);
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Set up environment variables for testing
    process.env.SENDGRID_API_KEY = 'test-api-key';
    process.env.FROM_EMAIL = 'test@example.com';
    process.env.FROM_NAME = 'Test Sender';
    
    activity = new SendGridNotificationActivity();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    delete process.env.SENDGRID_API_KEY;
    delete process.env.FROM_EMAIL;
    delete process.env.FROM_NAME;
  });

  describe('constructor', () => {
    it('should initialize with provided parameters', () => {
      const customActivity = new SendGridNotificationActivity(
        'custom-key',
        'custom@example.com',
        'Custom Sender'
      );
      expect(sgMail.setApiKey).toHaveBeenCalledWith('custom-key');
    });

    it('should use environment variables when parameters not provided', () => {
      process.env.SENDGRID_API_KEY = 'env-api-key';
      const envActivity = new SendGridNotificationActivity();
      expect(sgMail.setApiKey).toHaveBeenCalledWith('env-api-key');
    });

    it('should throw error when API key is missing', () => {
      delete process.env.SENDGRID_API_KEY;
      expect(() => new SendGridNotificationActivity()).toThrow('SendGrid API key is required');
    });
  });

  describe('sendEmailNotification', () => {
    it('should send email successfully and return true', async () => {
      const mockResponse = [{
        statusCode: 202,
        headers: { 'x-message-id': 'msg-123' }
      }];
      mockSend.mockResolvedValue(mockResponse);

      const result = await activity.sendEmailNotification(mockNotification);

      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalledWith({
        to: {
          email: 'customer@example.com',
          name: 'Customer CUST-456'
        },
        from: {
          email: 'test@example.com',
          name: 'Test Sender'
        },
        subject: 'Delivery Delay Update - Route ROUTE-123',
        html: expect.stringContaining('Estimated Delay: 35 minutes'),
        text: expect.stringContaining('Estimated Delay: 35 minutes')
      });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[NotificationActivity] Email sent successfully')
      );
      expect(mockNotification.sentAt).toBeInstanceOf(Date);
    });

    it('should log preparation and sending messages', async () => {
      const mockResponse = [{ statusCode: 202, headers: {} }];
      mockSend.mockResolvedValue(mockResponse);

      await activity.sendEmailNotification(mockNotification);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[NotificationActivity] Preparing to send email notification to customer@example.com for route ROUTE-123'
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[NotificationActivity] Sending email via SendGrid API to customer@example.com'
      );
    });

    it('should handle validation errors and return false', async () => {
      const invalidNotification = { ...mockNotification, customerEmail: 'invalid-email' };

      const result = await activity.sendEmailNotification(invalidNotification);

      expect(result).toBe(false);
      expect(mockSend).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[NotificationActivity] Failed to send email notification:',
        expect.any(Error)
      );
    });

    it('should throw error for retryable SendGrid errors', async () => {
      const retryableError = {
        response: { status: 500 },
        message: 'Internal server error'
      };
      mockSend.mockRejectedValue(retryableError);

      await expect(activity.sendEmailNotification(mockNotification))
        .rejects.toThrow('Retryable email sending error: Internal server error');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[NotificationActivity] Failed to send email notification:',
        retryableError
      );
    });

    it('should return false for non-retryable SendGrid errors', async () => {
      const nonRetryableError = {
        response: { status: 400 },
        message: 'Bad request'
      };
      mockSend.mockRejectedValue(nonRetryableError);

      const result = await activity.sendEmailNotification(mockNotification);

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[NotificationActivity] Non-retryable error occurred. Email not sent.'
      );
    });

    it('should handle network timeout errors as retryable', async () => {
      const timeoutError = { code: 'ETIMEDOUT', message: 'Request timeout' };
      mockSend.mockRejectedValue(timeoutError);

      await expect(activity.sendEmailNotification(mockNotification))
        .rejects.toThrow('Retryable email sending error: Request timeout');
    });

    it('should handle rate limiting as retryable', async () => {
      const rateLimitError = {
        response: { status: 429 },
        message: 'Rate limit exceeded'
      };
      mockSend.mockRejectedValue(rateLimitError);

      await expect(activity.sendEmailNotification(mockNotification))
        .rejects.toThrow('Retryable email sending error: Rate limit exceeded');
    });

    it('should handle authentication errors as non-retryable', async () => {
      const authError = {
        response: { status: 401 },
        message: 'Unauthorized - authentication failed'
      };
      mockSend.mockRejectedValue(authError);

      const result = await activity.sendEmailNotification(mockNotification);

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[NotificationActivity] Non-retryable error occurred. Email not sent.'
      );
    });
  });

  describe('email template generation', () => {
    it('should generate HTML template with all notification details', async () => {
      const mockResponse = [{ statusCode: 202, headers: {} }];
      mockSend.mockResolvedValue(mockResponse);

      await activity.sendEmailNotification(mockNotification);

      const emailCall = mockSend.mock.calls[0][0];
      const htmlContent = emailCall.html;



      expect(htmlContent).toContain('Estimated Delay: 35 minutes');
      expect(htmlContent).toContain('Route ID:</strong> ROUTE-123');
      expect(htmlContent).toContain('From:</strong> 123 Main St, City A');
      expect(htmlContent).toContain('To:</strong> 456 Oak Ave, City B');
      expect(htmlContent).toContain('Baseline Time:</strong> 45 minutes');
      expect(htmlContent).toContain('We apologize for the delay');
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('Freight Delay Monitor');
    });

    it('should generate plain text template with all notification details', async () => {
      const mockResponse = [{ statusCode: 202, headers: {} }];
      mockSend.mockResolvedValue(mockResponse);

      await activity.sendEmailNotification(mockNotification);

      const emailCall = mockSend.mock.calls[0][0];
      const textContent = emailCall.text;

      expect(textContent).toContain('DELIVERY DELAY UPDATE');
      expect(textContent).toContain('Estimated Delay: 35 minutes');
      expect(textContent).toContain('Route ID: ROUTE-123');
      expect(textContent).toContain('From: 123 Main St, City A');
      expect(textContent).toContain('To: 456 Oak Ave, City B');
      expect(textContent).toContain('Baseline Time: 45 minutes');
      expect(textContent).toContain('We apologize for the delay');
      expect(textContent).toContain('Freight Delay Monitor');
    });

    it('should include proper email subject', async () => {
      const mockResponse = [{ statusCode: 202, headers: {} }];
      mockSend.mockResolvedValue(mockResponse);

      await activity.sendEmailNotification(mockNotification);

      const emailCall = mockSend.mock.calls[0][0];
      expect(emailCall.subject).toBe('Delivery Delay Update - Route ROUTE-123');
    });

    it('should set proper sender and recipient information', async () => {
      const mockResponse = [{ statusCode: 202, headers: {} }];
      mockSend.mockResolvedValue(mockResponse);

      await activity.sendEmailNotification(mockNotification);

      const emailCall = mockSend.mock.calls[0][0];
      expect(emailCall.to).toEqual({
        email: 'customer@example.com',
        name: 'Customer CUST-456'
      });
      expect(emailCall.from).toEqual({
        email: 'test@example.com',
        name: 'Test Sender'
      });
    });
  });

  describe('error classification', () => {
    it('should classify server errors (5xx) as retryable', async () => {
      const serverError = { response: { status: 503 }, message: 'Service unavailable' };
      mockSend.mockRejectedValue(serverError);

      await expect(activity.sendEmailNotification(mockNotification))
        .rejects.toThrow('Retryable email sending error');
    });

    it('should classify client errors (4xx) as non-retryable except 429', async () => {
      const clientError = { response: { status: 404 }, message: 'Not found' };
      mockSend.mockRejectedValue(clientError);

      const result = await activity.sendEmailNotification(mockNotification);
      expect(result).toBe(false);
    });

    it('should classify network errors as retryable', async () => {
      const networkErrors = [
        { code: 'ECONNRESET', message: 'Connection reset' },
        { code: 'ETIMEDOUT', message: 'Timeout' },
        { code: 'ENOTFOUND', message: 'Host not found' }
      ];

      for (const error of networkErrors) {
        mockSend.mockRejectedValue(error);
        await expect(activity.sendEmailNotification(mockNotification))
          .rejects.toThrow('Retryable email sending error');
      }
    });

    it('should classify unknown errors as retryable by default', async () => {
      const unknownError = new Error('Unknown error');
      mockSend.mockRejectedValue(unknownError);

      await expect(activity.sendEmailNotification(mockNotification))
        .rejects.toThrow('Retryable email sending error: Unknown error');
    });
  });

  describe('input validation', () => {
    it('should validate notification data before sending', async () => {
      const invalidNotifications = [
        { ...mockNotification, customerId: '' },
        { ...mockNotification, customerEmail: 'invalid-email' },
        { ...mockNotification, delayMinutes: -1 },
        { ...mockNotification, message: '' },
        { ...mockNotification, route: null }
      ];

      for (const invalid of invalidNotifications) {
        const result = await activity.sendEmailNotification(invalid);
        expect(result).toBe(false);
        expect(mockSend).not.toHaveBeenCalled();
      }
    });

    it('should accept valid notification data', async () => {
      const mockResponse = [{ statusCode: 202, headers: {} }];
      mockSend.mockResolvedValue(mockResponse);

      const result = await activity.sendEmailNotification(mockNotification);
      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe('factory function', () => {
    it('should create notification activity instance with custom parameters', () => {
      const activity = createNotificationActivity('custom-key', 'custom@test.com', 'Custom Name');
      expect(activity).toBeInstanceOf(SendGridNotificationActivity);
      expect(sgMail.setApiKey).toHaveBeenCalledWith('custom-key');
    });

    it('should create notification activity instance with default parameters', () => {
      const activity = createNotificationActivity();
      expect(activity).toBeInstanceOf(SendGridNotificationActivity);
    });
  });
});