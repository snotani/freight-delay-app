import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  loadEnvironmentConfig,
  validateEnvironment,
  ConfigurationError,
  getConfigurationHelp
} from './environment';
import {
  loadTemporalConfig,
  validateTemporalConfig,
  getTemporalConfigurationHelp
} from './temporal-config';
import {
  configManager,
  loadApplicationConfig,
  getApplicationConfig,
  validateApplicationConfig,
  getCompleteConfigurationHelp
} from './config-manager';

// Mock environment variables
const mockEnv = {
  GOOGLE_MAPS_API_KEY: 'AIzaSyDummyGoogleMapsKey123456789',
  OPENAI_API_KEY: 'sk-dummy-openai-key-1234567890abcdef',
  SENDGRID_API_KEY: 'SG.dummy-sendgrid-key-1234567890abcdef',
  DELAY_THRESHOLD_MINUTES: '45',
  NODE_ENV: 'test',
  MAX_RETRY_ATTEMPTS: '5',
  ACTIVITY_TIMEOUT_SECONDS: '120',
  WORKFLOW_TIMEOUT_SECONDS: '600',
  DEBUG_LOGGING: 'true',
  TEMPORAL_SERVER_URL: 'localhost:7233',
  TEMPORAL_NAMESPACE: 'test-namespace',
  TEMPORAL_TASK_QUEUE: 'test-queue',
  TEMPORAL_CONNECTION_TIMEOUT_MS: '15000',
  TEMPORAL_MAX_CONCURRENT_ACTIVITIES: '15',
  TEMPORAL_MAX_CONCURRENT_WORKFLOWS: '8'
};

describe('Environment Configuration', () => {
  beforeEach(() => {
    // Reset environment
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('GOOGLE_MAPS_') || key.startsWith('OPENAI_') || 
          key.startsWith('SENDGRID_') || key.startsWith('DELAY_') ||
          key.startsWith('NODE_') || key.startsWith('MAX_') ||
          key.startsWith('ACTIVITY_') || key.startsWith('WORKFLOW_') ||
          key.startsWith('DEBUG_')) {
        delete process.env[key];
      }
    });
  });

  afterEach(() => {
    configManager.reset();
  });

  it('should load valid environment configuration', () => {
    // Set valid environment variables
    Object.assign(process.env, mockEnv);

    const config = loadEnvironmentConfig();

    expect(config.googleMapsApiKey).toBe(mockEnv.GOOGLE_MAPS_API_KEY);
    expect(config.openaiApiKey).toBe(mockEnv.OPENAI_API_KEY);
    expect(config.sendgridApiKey).toBe(mockEnv.SENDGRID_API_KEY);
    expect(config.delayThresholdMinutes).toBe(45);
    expect(config.nodeEnv).toBe('test');
    expect(config.maxRetryAttempts).toBe(5);
    expect(config.activityTimeoutSeconds).toBe(120);
    expect(config.workflowTimeoutSeconds).toBe(600);
    expect(config.debugLogging).toBe(true);
  });

  it('should use default values for optional variables', () => {
    // Set only required variables
    process.env.GOOGLE_MAPS_API_KEY = mockEnv.GOOGLE_MAPS_API_KEY;
    process.env.OPENAI_API_KEY = mockEnv.OPENAI_API_KEY;
    process.env.SENDGRID_API_KEY = mockEnv.SENDGRID_API_KEY;

    const config = loadEnvironmentConfig();

    expect(config.delayThresholdMinutes).toBe(30); // default
    expect(config.nodeEnv).toBe('development'); // default
    expect(config.maxRetryAttempts).toBe(3); // default
    expect(config.debugLogging).toBe(false); // default
  });

  it('should throw ConfigurationError for missing required variables', () => {
    // Don't set any environment variables
    expect(() => loadEnvironmentConfig()).toThrow(ConfigurationError);
    expect(() => loadEnvironmentConfig()).toThrow(/Configuration validation failed/);
  });

  it('should validate API key formats', () => {
    // Set invalid API keys
    process.env.GOOGLE_MAPS_API_KEY = 'invalid-key';
    process.env.OPENAI_API_KEY = 'invalid-key';
    process.env.SENDGRID_API_KEY = 'invalid-key';

    expect(() => loadEnvironmentConfig()).toThrow(ConfigurationError);
  });

  it('should validate numeric values', () => {
    Object.assign(process.env, mockEnv);
    process.env.DELAY_THRESHOLD_MINUTES = 'not-a-number';

    expect(() => loadEnvironmentConfig()).toThrow(ConfigurationError);
  });

  it('should validate environment values', () => {
    Object.assign(process.env, mockEnv);
    process.env.NODE_ENV = 'invalid-env';

    expect(() => loadEnvironmentConfig()).toThrow(ConfigurationError);
  });

  it('should provide configuration help', () => {
    const help = getConfigurationHelp();
    expect(help).toContain('Freight Delay Monitor');
    expect(help).toContain('GOOGLE_MAPS_API_KEY');
    expect(help).toContain('Required Environment Variables');
    expect(help).toContain('Optional Environment Variables');
  });
});

describe('Temporal Configuration', () => {
  beforeEach(() => {
    // Reset Temporal environment variables
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('TEMPORAL_')) {
        delete process.env[key];
      }
    });
  });

  it('should load valid Temporal configuration', () => {
    // Set Temporal environment variables
    Object.assign(process.env, {
      TEMPORAL_SERVER_URL: mockEnv.TEMPORAL_SERVER_URL,
      TEMPORAL_NAMESPACE: mockEnv.TEMPORAL_NAMESPACE,
      TEMPORAL_TASK_QUEUE: mockEnv.TEMPORAL_TASK_QUEUE,
      TEMPORAL_CONNECTION_TIMEOUT_MS: mockEnv.TEMPORAL_CONNECTION_TIMEOUT_MS,
      TEMPORAL_MAX_CONCURRENT_ACTIVITIES: mockEnv.TEMPORAL_MAX_CONCURRENT_ACTIVITIES,
      TEMPORAL_MAX_CONCURRENT_WORKFLOWS: mockEnv.TEMPORAL_MAX_CONCURRENT_WORKFLOWS
    });

    const config = loadTemporalConfig();

    expect(config.serverUrl).toBe('localhost:7233');
    expect(config.namespace).toBe('test-namespace');
    expect(config.taskQueue).toBe('test-queue');
    expect(config.connectionTimeoutMs).toBe(15000);
    expect(config.maxConcurrentActivityExecutions).toBe(15);
    expect(config.maxConcurrentWorkflowExecutions).toBe(8);
  });

  it('should use default values when not specified', () => {
    const config = loadTemporalConfig();

    expect(config.serverUrl).toBe('localhost:7233');
    expect(config.namespace).toBe('default');
    expect(config.taskQueue).toBe('freight-delay-monitor');
    expect(config.connectionTimeoutMs).toBe(10000);
    expect(config.maxConcurrentActivityExecutions).toBe(10);
    expect(config.maxConcurrentWorkflowExecutions).toBe(5);
  });

  it('should validate server URL format', () => {
    process.env.TEMPORAL_SERVER_URL = 'invalid-url';

    expect(() => loadTemporalConfig()).toThrow(ConfigurationError);
  });

  it('should validate namespace format', () => {
    process.env.TEMPORAL_NAMESPACE = 'invalid namespace with spaces';

    expect(() => loadTemporalConfig()).toThrow(ConfigurationError);
  });

  it('should validate numeric values', () => {
    process.env.TEMPORAL_CONNECTION_TIMEOUT_MS = 'not-a-number';

    expect(() => loadTemporalConfig()).toThrow(ConfigurationError);
  });

  it('should provide Temporal configuration help', () => {
    const help = getTemporalConfigurationHelp();
    expect(help).toContain('Temporal Configuration Options');
    expect(help).toContain('TEMPORAL_SERVER_URL');
    expect(help).toContain('TEMPORAL_NAMESPACE');
  });
});

describe('Configuration Manager', () => {
  beforeEach(() => {
    // Reset all environment variables
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('GOOGLE_MAPS_') || key.startsWith('OPENAI_') || 
          key.startsWith('SENDGRID_') || key.startsWith('DELAY_') ||
          key.startsWith('NODE_') || key.startsWith('MAX_') ||
          key.startsWith('ACTIVITY_') || key.startsWith('WORKFLOW_') ||
          key.startsWith('DEBUG_') || key.startsWith('TEMPORAL_')) {
        delete process.env[key];
      }
    });
    configManager.reset();
  });

  it('should load complete application configuration', async () => {
    // Set all environment variables
    Object.assign(process.env, mockEnv);

    // Mock Temporal connection validation
    vi.mock('./temporal-config', async () => {
      const actual = await vi.importActual('./temporal-config');
      return {
        ...actual,
        validateTemporalConfig: vi.fn().mockResolvedValue(undefined)
      };
    });

    const config = await loadApplicationConfig({ skipValidation: true });

    expect(config.environment).toBeDefined();
    expect(config.temporal).toBeDefined();
    expect(config.metadata).toBeDefined();
    expect(config.metadata.isValid).toBe(true);
    expect(config.metadata.source).toBe('environment');
  });

  it('should handle configuration loading errors', async () => {
    // Don't set required environment variables
    await expect(loadApplicationConfig()).rejects.toThrow(ConfigurationError);
  });

  it('should get configuration value by path', async () => {
    Object.assign(process.env, mockEnv);
    
    await loadApplicationConfig({ skipValidation: true });
    
    const delayThreshold = configManager.getConfigValue('environment.delayThresholdMinutes');
    expect(delayThreshold).toBe(45);
    
    const serverUrl = configManager.getConfigValue('temporal.serverUrl');
    expect(serverUrl).toBe('localhost:7233');
    
    const nonExistent = configManager.getConfigValue('nonexistent.path', 'default');
    expect(nonExistent).toBe('default');
  });

  it('should validate loaded configuration', async () => {
    Object.assign(process.env, mockEnv);
    
    await loadApplicationConfig({ skipValidation: true });
    
    // Mock validation functions to avoid actual API calls
    vi.mock('./environment', async () => {
      const actual = await vi.importActual('./environment');
      return {
        ...actual,
        validateEnvironment: vi.fn()
      };
    });
    
    vi.mock('./temporal-config', async () => {
      const actual = await vi.importActual('./temporal-config');
      return {
        ...actual,
        validateTemporalConfig: vi.fn().mockResolvedValue(undefined)
      };
    });

    const result = await validateApplicationConfig();
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should check if configuration is valid', async () => {
    expect(configManager.isConfigurationValid()).toBe(false);
    
    Object.assign(process.env, mockEnv);
    await loadApplicationConfig({ skipValidation: true });
    
    expect(configManager.isConfigurationValid()).toBe(true);
  });

  it('should reload configuration', async () => {
    Object.assign(process.env, mockEnv);
    
    const config1 = await loadApplicationConfig({ skipValidation: true });
    const loadTime1 = config1.metadata.loadedAt;
    
    // Wait a bit and reload
    await new Promise(resolve => setTimeout(resolve, 10));
    const config2 = await configManager.reloadConfiguration({ skipValidation: true });
    const loadTime2 = config2.metadata.loadedAt;
    
    expect(loadTime2.getTime()).toBeGreaterThan(loadTime1.getTime());
  });

  it('should provide complete configuration help', () => {
    const help = getCompleteConfigurationHelp();
    expect(help).toContain('Freight Delay Monitor - Complete Configuration Guide');
    expect(help).toContain('Configuration Loading');
    expect(help).toContain('Validation');
    expect(help).toContain('Debugging');
  });
});

describe('Configuration Error Handling', () => {
  it('should create ConfigurationError with details', () => {
    const error = new ConfigurationError(
      'Test error message',
      'TEST_FIELD',
      'invalid-value',
      'string'
    );

    expect(error.message).toBe('Test error message');
    expect(error.field).toBe('TEST_FIELD');
    expect(error.value).toBe('invalid-value');
    expect(error.expectedType).toBe('string');
    expect(error.name).toBe('ConfigurationError');
  });

  it('should handle multiple validation errors', () => {
    // Set invalid values for multiple fields
    process.env.GOOGLE_MAPS_API_KEY = 'invalid';
    process.env.OPENAI_API_KEY = 'invalid';
    process.env.DELAY_THRESHOLD_MINUTES = 'not-a-number';

    expect(() => loadEnvironmentConfig()).toThrow(ConfigurationError);
    
    try {
      loadEnvironmentConfig();
    } catch (error) {
      if (error instanceof ConfigurationError) {
        expect(error.message).toContain('Configuration validation failed');
        expect(error.message).toContain('error(s)');
      }
    }
  });
});