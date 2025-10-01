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
  
  const configObj = config as Record<string, unknown>;
  
  if (typeof configObj.delayThresholdMinutes !== 'number' || configObj.delayThresholdMinutes <= 0) {
    throw new Error('Delay threshold must be a positive number');
  }
  
  if (typeof configObj.retryAttempts !== 'number' || configObj.retryAttempts < 0 || !Number.isInteger(configObj.retryAttempts)) {
    throw new Error('Retry attempts must be a non-negative integer');
  }
  
  if (!configObj.fallbackMessage || typeof configObj.fallbackMessage !== 'string' || configObj.fallbackMessage.trim().length === 0) {
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
  
  const configObj = config as Record<string, unknown>;
  
  if (!configObj.googleMapsApiKey || typeof configObj.googleMapsApiKey !== 'string' || configObj.googleMapsApiKey.trim().length === 0) {
    throw new Error('Google Maps API key must be a non-empty string');
  }
  
  if (!configObj.openaiApiKey || typeof configObj.openaiApiKey !== 'string' || configObj.openaiApiKey.trim().length === 0) {
    throw new Error('OpenAI API key must be a non-empty string');
  }
  
  if (!configObj.sendgridApiKey || typeof configObj.sendgridApiKey !== 'string' || configObj.sendgridApiKey.trim().length === 0) {
    throw new Error('SendGrid API key must be a non-empty string');
  }
  
  if (!configObj.senderEmail || typeof configObj.senderEmail !== 'string') {
    throw new Error('Sender email must be a string');
  }
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(configObj.senderEmail)) {
    throw new Error('Sender email must be a valid email address');
  }
  
  if (configObj.temporalServerUrl && (typeof configObj.temporalServerUrl !== 'string' || configObj.temporalServerUrl.trim().length === 0)) {
    throw new Error('Temporal server URL must be a non-empty string if provided');
  }
  
  if (configObj.senderName && (typeof configObj.senderName !== 'string' || configObj.senderName.trim().length === 0)) {
    throw new Error('Sender name must be a non-empty string if provided');
  }
  
  return true;
}