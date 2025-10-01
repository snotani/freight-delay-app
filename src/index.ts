/**
 * Freight Delay Monitor - Main Application Entry Point
 * 
 * This module serves as the primary entry point for the Freight Delay Monitor application.
 * It exports all the core components, utilities, and configurations needed to use the
 * freight delay monitoring system.
 * 
 * The application provides:
 * - Temporal workflow orchestration for reliable delay monitoring
 * - Google Maps integration for real-time traffic data
 * - OpenAI-powered personalized delay notifications
 * - SendGrid email delivery for customer communications
 * - Comprehensive logging and error handling
 * 
 * @example
 * ```typescript
 * import { executeWorkflow, DeliveryRoute, WorkflowConfig } from 'freight-delay-monitor';
 * 
 * const route: DeliveryRoute = {
 *   routeId: 'ROUTE-001',
 *   origin: 'San Francisco, CA',
 *   destination: 'San Jose, CA',
 *   baselineTimeMinutes: 60
 * };
 * 
 * const customer = {
 *   customerId: 'CUST-001',
 *   customerEmail: 'customer@example.com'
 * };
 * 
 * const config: WorkflowConfig = {
 *   delayThresholdMinutes: 30,
 *   retryAttempts: 3,
 *   fallbackMessage: 'Your delivery is delayed by {delayMinutes} minutes.'
 * };
 * 
 * const result = await executeWorkflow(route, customer, config);
 * console.log('Delay detected:', result.delayDetected);
 * ```
 * 
 * @packageDocumentation
 */

// Core workflow and activity exports
export * from './workflows';
export * from './activities';

// Type definitions and interfaces
export * from './types';

// Utility functions and helpers
export * from './utilities';

// Client and execution utilities
export * from './client';

// Configuration management
export { loadTemporalConfig, createTemporalConnection, createWorkerOptions } from './config/temporal-config';
export { loadEnvironmentConfig, validateEnvironment } from './config/environment';
export { ConfigManager } from './config/config-manager';

// Example data and scenarios for testing
export { default as sampleData } from './examples/sample-data';

/**
 * Application metadata and version information
 */
export const APP_INFO = {
  name: 'Freight Delay Monitor',
  version: '1.0.0',
  description: 'TypeScript application for monitoring delivery route delays with Temporal workflows',
  author: 'Freight Delay Monitor Team',
  license: 'MIT',
  repository: 'https://github.com/your-org/freight-delay-monitor',
  documentation: 'https://docs.freight-delay-monitor.com',
  support: 'https://support.freight-delay-monitor.com'
} as const;

/**
 * Default configuration values used throughout the application
 */
export const DEFAULT_CONFIG = {
  /** Default delay threshold in minutes */
  DELAY_THRESHOLD_MINUTES: 30,
  /** Default number of retry attempts for failed operations */
  RETRY_ATTEMPTS: 3,
  /** Default Temporal task queue name */
  TASK_QUEUE: 'freight-delay-monitor',
  /** Default Temporal server URL */
  TEMPORAL_SERVER_URL: 'localhost:7233',
  /** Default Temporal namespace */
  TEMPORAL_NAMESPACE: 'default',
  /** Default log level */
  LOG_LEVEL: 'info',
  /** Default workflow execution timeout in milliseconds */
  WORKFLOW_EXECUTION_TIMEOUT_MS: 600000, // 10 minutes
  /** Default workflow run timeout in milliseconds */
  WORKFLOW_RUN_TIMEOUT_MS: 300000, // 5 minutes
  /** Default activity timeout in milliseconds */
  ACTIVITY_TIMEOUT_MS: 60000, // 1 minute
  /** Default API request timeout in milliseconds */
  API_TIMEOUT_MS: 10000, // 10 seconds
} as const;

/**
 * Supported API providers and their configuration requirements
 */
export const API_PROVIDERS = {
  GOOGLE_MAPS: {
    name: 'Google Maps Distance Matrix API',
    baseUrl: 'https://maps.googleapis.com/maps/api/distancematrix/json',
    requiredEnvVars: ['GOOGLE_MAPS_API_KEY'],
    documentation: 'https://developers.google.com/maps/documentation/distance-matrix'
  },
  OPENAI: {
    name: 'OpenAI Chat Completions API',
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    requiredEnvVars: ['OPENAI_API_KEY'],
    documentation: 'https://platform.openai.com/docs/api-reference/chat'
  },
  SENDGRID: {
    name: 'SendGrid Email API',
    baseUrl: 'https://api.sendgrid.com/v3/mail/send',
    requiredEnvVars: ['SENDGRID_API_KEY'],
    documentation: 'https://docs.sendgrid.com/api-reference/mail-send/mail-send'
  }
} as const;

/**
 * Application feature flags for enabling/disabling functionality
 */
export const FEATURE_FLAGS = {
  /** Enable AI message generation (requires OpenAI API key) */
  ENABLE_AI_MESSAGES: true,
  /** Enable email notifications (requires SendGrid API key) */
  ENABLE_EMAIL_NOTIFICATIONS: true,
  /** Enable comprehensive metrics collection */
  ENABLE_METRICS: true,
  /** Enable debug logging in development */
  ENABLE_DEBUG_LOGGING: process.env.NODE_ENV === 'development',
  /** Enable workflow result caching */
  ENABLE_RESULT_CACHING: false,
  /** Enable rate limiting for API calls */
  ENABLE_RATE_LIMITING: true
} as const;