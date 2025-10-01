import { NativeConnection, WorkerOptions } from '@temporalio/worker';
import { ConfigurationError } from './environment';

/**
 * Temporal server configuration
 */
export interface TemporalConfig {
  /** Temporal server URL */
  serverUrl: string;
  /** Temporal namespace */
  namespace: string;
  /** Task queue name for workers */
  taskQueue: string;
  /** Connection timeout in milliseconds */
  connectionTimeoutMs: number;
  /** Maximum concurrent activity executions */
  maxConcurrentActivityExecutions: number;
  /** Maximum concurrent workflow executions */
  maxConcurrentWorkflowExecutions: number;
}

/**
 * Temporal configuration variable definitions
 */
interface TemporalVariable {
  name: string;
  defaultValue: string | number;
  validator?: (value: string) => boolean;
  parser?: (value: string) => any;
  description: string;
}

const temporalVariables: TemporalVariable[] = [
  {
    name: 'TEMPORAL_SERVER_URL',
    defaultValue: 'localhost:7233',
    description: 'Temporal server address and port',
    validator: (value: string) => {
      // Basic URL validation - should contain host:port format
      const urlPattern = /^[a-zA-Z0-9.-]+:\d+$/;
      return urlPattern.test(value) || value.startsWith('http://') || value.startsWith('https://');
    }
  },
  {
    name: 'TEMPORAL_NAMESPACE',
    defaultValue: 'default',
    description: 'Temporal namespace for workflow isolation',
    validator: (value: string) => value.length > 0 && /^[a-zA-Z0-9._-]+$/.test(value)
  },
  {
    name: 'TEMPORAL_TASK_QUEUE',
    defaultValue: 'freight-delay-monitor',
    description: 'Task queue name for worker registration',
    validator: (value: string) => value.length > 0 && /^[a-zA-Z0-9._-]+$/.test(value)
  },
  {
    name: 'TEMPORAL_CONNECTION_TIMEOUT_MS',
    defaultValue: 10000,
    description: 'Connection timeout in milliseconds',
    validator: (value: string) => !isNaN(parseInt(value)) && parseInt(value) > 0,
    parser: (value: string) => parseInt(value, 10)
  },
  {
    name: 'TEMPORAL_MAX_CONCURRENT_ACTIVITIES',
    defaultValue: 10,
    description: 'Maximum concurrent activity task executions',
    validator: (value: string) => !isNaN(parseInt(value)) && parseInt(value) > 0,
    parser: (value: string) => parseInt(value, 10)
  },
  {
    name: 'TEMPORAL_MAX_CONCURRENT_WORKFLOWS',
    defaultValue: 5,
    description: 'Maximum concurrent workflow task executions',
    validator: (value: string) => !isNaN(parseInt(value)) && parseInt(value) > 0,
    parser: (value: string) => parseInt(value, 10)
  }
];

/**
 * Validate a single Temporal configuration variable
 * @param temporalVar Variable definition
 * @param value Current value from process.env
 * @returns Validated and parsed value
 * @throws ConfigurationError if validation fails
 */
function validateTemporalVariable(temporalVar: TemporalVariable, value: string | undefined): any {
  // Use default value if not provided
  const actualValue = value || temporalVar.defaultValue.toString();

  // Validate format if validator is provided
  if (temporalVar.validator && !temporalVar.validator(actualValue)) {
    throw new ConfigurationError(
      `Temporal configuration variable '${temporalVar.name}' has invalid format. ${temporalVar.description}`,
      temporalVar.name,
      actualValue,
      'valid format'
    );
  }

  // Parse value if parser is provided
  if (temporalVar.parser) {
    try {
      return temporalVar.parser(actualValue);
    } catch (error) {
      throw new ConfigurationError(
        `Failed to parse Temporal configuration variable '${temporalVar.name}': ${error instanceof Error ? error.message : 'Unknown error'}`,
        temporalVar.name,
        actualValue,
        'parseable value'
      );
    }
  }

  return actualValue;
}

/**
 * Load and validate Temporal configuration from environment variables
 * @returns Temporal configuration object
 * @throws ConfigurationError if validation fails
 */
export function loadTemporalConfig(): TemporalConfig {
  const errors: ConfigurationError[] = [];
  const config: Partial<TemporalConfig> = {};

  // Validate each Temporal configuration variable
  for (const temporalVar of temporalVariables) {
    try {
      const value = validateTemporalVariable(temporalVar, process.env[temporalVar.name]);
      
      // Map to config object
      switch (temporalVar.name) {
        case 'TEMPORAL_SERVER_URL':
          config.serverUrl = value;
          break;
        case 'TEMPORAL_NAMESPACE':
          config.namespace = value;
          break;
        case 'TEMPORAL_TASK_QUEUE':
          config.taskQueue = value;
          break;
        case 'TEMPORAL_CONNECTION_TIMEOUT_MS':
          config.connectionTimeoutMs = value;
          break;
        case 'TEMPORAL_MAX_CONCURRENT_ACTIVITIES':
          config.maxConcurrentActivityExecutions = value;
          break;
        case 'TEMPORAL_MAX_CONCURRENT_WORKFLOWS':
          config.maxConcurrentWorkflowExecutions = value;
          break;
      }
    } catch (error) {
      if (error instanceof ConfigurationError) {
        errors.push(error);
      } else {
        errors.push(new ConfigurationError(
          `Unexpected error validating ${temporalVar.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          temporalVar.name
        ));
      }
    }
  }

  // If there are validation errors, throw a comprehensive error
  if (errors.length > 0) {
    const errorMessages = errors.map(err => `  - ${err.message}`).join('\n');
    throw new ConfigurationError(
      `Temporal configuration validation failed with ${errors.length} error(s):\n${errorMessages}`
    );
  }

  return config as TemporalConfig;
}

/**
 * Create Temporal connection with proper error handling
 * @param config Temporal configuration
 * @returns Promise resolving to Temporal connection
 * @throws ConfigurationError if connection fails
 */
export async function createTemporalConnection(config: TemporalConfig): Promise<NativeConnection> {
  try {
    console.log(`🔗 Connecting to Temporal server at ${config.serverUrl}...`);
    
    const connection = await NativeConnection.connect({
      address: config.serverUrl,
    });
    
    console.log('✅ Successfully connected to Temporal server');
    return connection;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Failed to connect to Temporal server: ${errorMessage}`);
    
    throw new ConfigurationError(
      `Failed to connect to Temporal server at ${config.serverUrl}: ${errorMessage}`,
      'TEMPORAL_SERVER_URL',
      config.serverUrl,
      'accessible Temporal server'
    );
  }
}

/**
 * Generate worker options from Temporal configuration
 * @param config Temporal configuration
 * @returns Worker options object
 */
export function createWorkerOptions(config: TemporalConfig): Partial<WorkerOptions> {
  return {
    maxConcurrentActivityTaskExecutions: config.maxConcurrentActivityExecutions,
    maxConcurrentWorkflowTaskExecutions: config.maxConcurrentWorkflowExecutions,
  };
}

/**
 * Validate Temporal configuration and connection
 * @throws ConfigurationError if validation fails
 */
export async function validateTemporalConfig(): Promise<void> {
  try {
    const config = loadTemporalConfig();
    console.log('✅ Temporal configuration validated successfully');
    
    // Test connection
    const connection = await createTemporalConnection(config);
    await connection.close();
    
    console.log('✅ Temporal server connection test successful');
  } catch (error) {
    console.error('❌ Temporal configuration validation failed:');
    if (error instanceof ConfigurationError) {
      console.error(error.message);
    } else {
      console.error('Unknown error:', error instanceof Error ? error.message : 'Unknown error');
    }
    throw error;
  }
}

/**
 * Get Temporal configuration help text
 * @returns Help text describing Temporal configuration options
 */
export function getTemporalConfigurationHelp(): string {
  const lines = [
    'Temporal Configuration Options',
    '=' .repeat(35),
    '',
    'Environment Variables:',
    ...temporalVariables.map(env => 
      `  ${env.name}: ${env.description} (default: ${env.defaultValue})`
    ),
    '',
    'Example configuration:',
    ...temporalVariables.map(env => `  ${env.name}=${env.defaultValue}`)
  ];
  
  return lines.join('\n');
}