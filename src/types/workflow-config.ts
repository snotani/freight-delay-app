/**
 * Configuration parameters for the freight delay monitoring workflow
 */
export interface WorkflowConfig {
  /** Minimum delay in minutes that triggers a notification */
  delayThresholdMinutes: number;
  /** Maximum number of retry attempts for failed activities */
  retryAttempts: number;
  /** Default message to use when AI message generation fails */
  fallbackMessage: string;
}

/**
 * Environment configuration for API keys and external service settings
 */
export interface EnvironmentConfig {
  /** Google Maps API key for traffic data retrieval */
  googleMapsApiKey: string;
  /** OpenAI API key for message generation */
  openaiApiKey: string;
  /** SendGrid API key for email notifications */
  sendgridApiKey: string;
  /** Temporal server URL for workflow execution */
  temporalServerUrl?: string;
  /** Default sender email address for notifications */
  senderEmail: string;
  /** Default sender name for notifications */
  senderName?: string;
}

/**
 * Complete application configuration combining workflow and environment settings
 */
export interface AppConfig extends WorkflowConfig, EnvironmentConfig {}

/**
 * Input validation function for WorkflowConfig data
 * @param config - The configuration data to validate
 * @returns true if valid, throws error if invalid
 */
export function validateWorkflowConfig(config: unknown): config is WorkflowConfig {
  if (!config || typeof config !== 'object') {
    throw new Error('Configuration must be an object');
  }
  
  if (typeof config.delayThresholdMinutes !== 'number' || config.delayThresholdMinutes <= 0) {
    throw new Error('Delay threshold must be a positive number');
  }
  
  if (typeof config.retryAttempts !== 'number' || config.retryAttempts < 0 || !Number.isInteger(config.retryAttempts)) {
    throw new Error('Retry attempts must be a non-negative integer');
  }
  
  if (!config.fallbackMessage || typeof config.fallbackMessage !== 'string' || config.fallbackMessage.trim().length === 0) {
    throw new Error('Fallback message must be a non-empty string');
  }
  
  return true;
}

/**
 * Input validation function for EnvironmentConfig data
 * @param config - The environment configuration data to validate
 * @returns true if valid, throws error if invalid
 */
export function validateEnvironmentConfig(config: unknown): config is EnvironmentConfig {
  if (!config || typeof config !== 'object') {
    throw new Error('Environment configuration must be an object');
  }
  
  if (!config.googleMapsApiKey || typeof config.googleMapsApiKey !== 'string' || config.googleMapsApiKey.trim().length === 0) {
    throw new Error('Google Maps API key must be a non-empty string');
  }
  
  if (!config.openaiApiKey || typeof config.openaiApiKey !== 'string' || config.openaiApiKey.trim().length === 0) {
    throw new Error('OpenAI API key must be a non-empty string');
  }
  
  if (!config.sendgridApiKey || typeof config.sendgridApiKey !== 'string' || config.sendgridApiKey.trim().length === 0) {
    throw new Error('SendGrid API key must be a non-empty string');
  }
  
  if (!config.senderEmail || typeof config.senderEmail !== 'string') {
    throw new Error('Sender email must be a string');
  }
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(config.senderEmail)) {
    throw new Error('Sender email must be a valid email address');
  }
  
  if (config.temporalServerUrl && (typeof config.temporalServerUrl !== 'string' || config.temporalServerUrl.trim().length === 0)) {
    throw new Error('Temporal server URL must be a non-empty string if provided');
  }
  
  if (config.senderName && (typeof config.senderName !== 'string' || config.senderName.trim().length === 0)) {
    throw new Error('Sender name must be a non-empty string if provided');
  }
  
  return true;
}