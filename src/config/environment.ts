import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Application environment configuration
 */
export interface EnvironmentConfig {
  /** Google Maps API key */
  googleMapsApiKey: string;
  /** OpenAI API key */
  openaiApiKey: string;
  /** SendGrid API key */
  sendgridApiKey: string;
  /** Default delay threshold in minutes */
  delayThresholdMinutes: number;
  /** Node environment */
  nodeEnv: string;
  /** Maximum retry attempts for activities */
  maxRetryAttempts: number;
  /** Activity timeout in seconds */
  activityTimeoutSeconds: number;
  /** Workflow timeout in seconds */
  workflowTimeoutSeconds: number;
  /** Enable debug logging */
  debugLogging: boolean;
}

/**
 * Configuration validation error with detailed information
 */
export class ConfigurationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: any,
    public readonly expectedType?: string
  ) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Environment variable definition with validation rules
 */
interface EnvironmentVariable {
  name: string;
  required: boolean;
  defaultValue?: string | number | boolean;
  validator?: (value: string) => boolean;
  parser?: (value: string) => any;
  description: string;
}

/**
 * Environment variable definitions with validation rules
 */
const environmentVariables: EnvironmentVariable[] = [
  {
    name: 'GOOGLE_MAPS_API_KEY',
    required: true,
    description: 'Google Maps API key for traffic data retrieval',
    validator: (value: string) => value.length > 10 && value.startsWith('AIza')
  },
  {
    name: 'OPENAI_API_KEY',
    required: true,
    description: 'OpenAI API key for message generation',
    validator: (value: string) => value.length > 20 && value.startsWith('sk-')
  },
  {
    name: 'SENDGRID_API_KEY',
    required: true,
    description: 'SendGrid API key for email notifications',
    validator: (value: string) => value.length > 20 && value.startsWith('SG.')
  },
  {
    name: 'DELAY_THRESHOLD_MINUTES',
    required: false,
    defaultValue: 30,
    description: 'Minimum delay in minutes to trigger notifications',
    validator: (value: string) => !isNaN(parseInt(value)) && parseInt(value) > 0,
    parser: (value: string) => parseInt(value, 10)
  },
  {
    name: 'NODE_ENV',
    required: false,
    defaultValue: 'development',
    description: 'Node.js environment (development, production, test)',
    validator: (value: string) => ['development', 'production', 'test'].includes(value)
  },
  {
    name: 'MAX_RETRY_ATTEMPTS',
    required: false,
    defaultValue: 3,
    description: 'Maximum number of retry attempts for failed activities',
    validator: (value: string) => !isNaN(parseInt(value)) && parseInt(value) >= 0,
    parser: (value: string) => parseInt(value, 10)
  },
  {
    name: 'ACTIVITY_TIMEOUT_SECONDS',
    required: false,
    defaultValue: 60,
    description: 'Timeout for individual activities in seconds',
    validator: (value: string) => !isNaN(parseInt(value)) && parseInt(value) > 0,
    parser: (value: string) => parseInt(value, 10)
  },
  {
    name: 'WORKFLOW_TIMEOUT_SECONDS',
    required: false,
    defaultValue: 300,
    description: 'Timeout for entire workflow execution in seconds',
    validator: (value: string) => !isNaN(parseInt(value)) && parseInt(value) > 0,
    parser: (value: string) => parseInt(value, 10)
  },
  {
    name: 'DEBUG_LOGGING',
    required: false,
    defaultValue: false,
    description: 'Enable debug logging for troubleshooting',
    validator: (value: string) => ['true', 'false', '1', '0'].includes(value.toLowerCase()),
    parser: (value: string) => ['true', '1'].includes(value.toLowerCase())
  }
];

/**
 * Validate a single environment variable
 * @param envVar Environment variable definition
 * @param value Current value from process.env
 * @returns Validated and parsed value
 * @throws ConfigurationError if validation fails
 */
function validateEnvironmentVariable(envVar: EnvironmentVariable, value: string | undefined): any {
  // Check if required variable is missing
  if (envVar.required && (!value || value.trim() === '')) {
    throw new ConfigurationError(
      `Required environment variable '${envVar.name}' is missing or empty`,
      envVar.name,
      value,
      'string'
    );
  }

  // Use default value if not provided
  if (!value || value.trim() === '') {
    return envVar.defaultValue;
  }

  // Validate format if validator is provided
  if (envVar.validator && !envVar.validator(value)) {
    throw new ConfigurationError(
      `Environment variable '${envVar.name}' has invalid format. ${envVar.description}`,
      envVar.name,
      value,
      'valid format'
    );
  }

  // Parse value if parser is provided
  if (envVar.parser) {
    try {
      return envVar.parser(value);
    } catch (error) {
      throw new ConfigurationError(
        `Failed to parse environment variable '${envVar.name}': ${error instanceof Error ? error.message : 'Unknown error'}`,
        envVar.name,
        value,
        'parseable value'
      );
    }
  }

  return value;
}

/**
 * Load and validate environment configuration
 * @returns Environment configuration object
 * @throws ConfigurationError if validation fails
 */
export function loadEnvironmentConfig(): EnvironmentConfig {
  const errors: ConfigurationError[] = [];
  const config: Partial<EnvironmentConfig> = {};

  // Validate each environment variable
  for (const envVar of environmentVariables) {
    try {
      const value = validateEnvironmentVariable(envVar, process.env[envVar.name]);
      
      // Map to config object
      switch (envVar.name) {
        case 'GOOGLE_MAPS_API_KEY':
          config.googleMapsApiKey = value;
          break;
        case 'OPENAI_API_KEY':
          config.openaiApiKey = value;
          break;
        case 'SENDGRID_API_KEY':
          config.sendgridApiKey = value;
          break;
        case 'DELAY_THRESHOLD_MINUTES':
          config.delayThresholdMinutes = value;
          break;
        case 'NODE_ENV':
          config.nodeEnv = value;
          break;
        case 'MAX_RETRY_ATTEMPTS':
          config.maxRetryAttempts = value;
          break;
        case 'ACTIVITY_TIMEOUT_SECONDS':
          config.activityTimeoutSeconds = value;
          break;
        case 'WORKFLOW_TIMEOUT_SECONDS':
          config.workflowTimeoutSeconds = value;
          break;
        case 'DEBUG_LOGGING':
          config.debugLogging = value;
          break;
      }
    } catch (error) {
      if (error instanceof ConfigurationError) {
        errors.push(error);
      } else {
        errors.push(new ConfigurationError(
          `Unexpected error validating ${envVar.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          envVar.name
        ));
      }
    }
  }

  // If there are validation errors, throw a comprehensive error
  if (errors.length > 0) {
    const errorMessages = errors.map(err => `  - ${err.message}`).join('\n');
    throw new ConfigurationError(
      `Configuration validation failed with ${errors.length} error(s):\n${errorMessages}`
    );
  }

  return config as EnvironmentConfig;
}

/**
 * Validate that all required environment variables are present and valid
 * @throws ConfigurationError if validation fails
 */
export function validateEnvironment(): void {
  try {
    const config = loadEnvironmentConfig();
    console.log('✅ Environment configuration validated successfully');
    
    if (config.debugLogging) {
      console.log('🔧 Debug logging enabled');
      console.log('📊 Configuration summary:', {
        delayThreshold: `${config.delayThresholdMinutes} minutes`,
        maxRetries: config.maxRetryAttempts,
        activityTimeout: `${config.activityTimeoutSeconds}s`,
        workflowTimeout: `${config.workflowTimeoutSeconds}s`,
        environment: config.nodeEnv
      });
    }
  } catch (error) {
    console.error('❌ Environment validation failed:');
    if (error instanceof ConfigurationError) {
      console.error(error.message);
    } else {
      console.error('Unknown error:', error instanceof Error ? error.message : 'Unknown error');
    }
    throw error;
  }
}

/**
 * Get configuration help text showing all available environment variables
 * @returns Help text describing all configuration options
 */
export function getConfigurationHelp(): string {
  const lines = [
    'Freight Delay Monitor - Configuration Options',
    '=' .repeat(50),
    '',
    'Required Environment Variables:',
    ...environmentVariables
      .filter(env => env.required)
      .map(env => `  ${env.name}: ${env.description}`),
    '',
    'Optional Environment Variables:',
    ...environmentVariables
      .filter(env => !env.required)
      .map(env => `  ${env.name}: ${env.description} (default: ${env.defaultValue})`),
    '',
    'Example .env file:',
    ...environmentVariables.map(env => {
      const value = env.required ? `your_${env.name.toLowerCase()}_here` : env.defaultValue;
      return `  ${env.name}=${value}`;
    })
  ];
  
  return lines.join('\n');
}