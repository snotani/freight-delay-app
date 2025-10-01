import { EnvironmentConfig, loadEnvironmentConfig, validateEnvironment, ConfigurationError, getConfigurationHelp } from './environment';
import { TemporalConfig, loadTemporalConfig, validateTemporalConfig, getTemporalConfigurationHelp } from './temporal-config';

/**
 * Complete application configuration
 */
export interface ApplicationConfig {
  /** Environment-specific configuration */
  environment: EnvironmentConfig;
  /** Temporal workflow configuration */
  temporal: TemporalConfig;
  /** Configuration metadata */
  metadata: ConfigurationMetadata;
}

/**
 * Configuration metadata for tracking and debugging
 */
export interface ConfigurationMetadata {
  /** When configuration was loaded */
  loadedAt: Date;
  /** Configuration source (environment, file, etc.) */
  source: string;
  /** Configuration version for tracking changes */
  version: string;
  /** Whether configuration is valid */
  isValid: boolean;
  /** Validation errors if any */
  validationErrors: string[];
}

/**
 * Configuration loading options
 */
export interface ConfigurationOptions {
  /** Skip validation during loading */
  skipValidation?: boolean;
  /** Enable verbose logging during configuration loading */
  verbose?: boolean;
  /** Custom environment variable prefix */
  envPrefix?: string;
  /** Configuration source identifier */
  source?: string;
}

/**
 * Singleton configuration manager for the application
 */
class ConfigurationManager {
  private static instance: ConfigurationManager;
  private config: ApplicationConfig | null = null;
  private isLoaded = false;

  private constructor() {}

  /**
   * Get singleton instance of configuration manager
   */
  public static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  /**
   * Load complete application configuration
   * @param options Configuration loading options
   * @returns Complete application configuration
   * @throws ConfigurationError if loading fails
   */
  public async loadConfiguration(options: ConfigurationOptions = {}): Promise<ApplicationConfig> {
    const { skipValidation = false, verbose = false, source = 'environment' } = options;
    
    if (verbose) {
      console.log('🔧 Loading application configuration...');
    }

    const errors: string[] = [];
    let environmentConfig: EnvironmentConfig;
    let temporalConfig: TemporalConfig;

    try {
      // Load environment configuration
      if (verbose) {
        console.log('📋 Loading environment configuration...');
      }
      environmentConfig = loadEnvironmentConfig();
      
      if (!skipValidation) {
        validateEnvironment();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Environment configuration error: ${errorMessage}`);
      throw new ConfigurationError(
        `Failed to load environment configuration: ${errorMessage}`
      );
    }

    try {
      // Load Temporal configuration
      if (verbose) {
        console.log('⚡ Loading Temporal configuration...');
      }
      temporalConfig = loadTemporalConfig();
      
      if (!skipValidation) {
        await validateTemporalConfig();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Temporal configuration error: ${errorMessage}`);
      throw new ConfigurationError(
        `Failed to load Temporal configuration: ${errorMessage}`
      );
    }

    // Create complete configuration
    this.config = {
      environment: environmentConfig,
      temporal: temporalConfig,
      metadata: {
        loadedAt: new Date(),
        source,
        version: '1.0.0',
        isValid: errors.length === 0,
        validationErrors: errors
      }
    };

    this.isLoaded = true;

    if (verbose) {
      console.log('✅ Application configuration loaded successfully');
      this.logConfigurationSummary();
    }

    return this.config;
  }

  /**
   * Get current configuration (load if not already loaded)
   * @param options Configuration loading options
   * @returns Current application configuration
   */
  public async getConfiguration(options: ConfigurationOptions = {}): Promise<ApplicationConfig> {
    if (!this.isLoaded || !this.config) {
      return await this.loadConfiguration(options);
    }
    return this.config;
  }

  /**
   * Reload configuration from environment
   * @param options Configuration loading options
   * @returns Reloaded application configuration
   */
  public async reloadConfiguration(options: ConfigurationOptions = {}): Promise<ApplicationConfig> {
    this.isLoaded = false;
    this.config = null;
    return await this.loadConfiguration(options);
  }

  /**
   * Validate current configuration
   * @returns Validation result
   */
  public async validateConfiguration(): Promise<{ isValid: boolean; errors: string[] }> {
    if (!this.config) {
      return { isValid: false, errors: ['Configuration not loaded'] };
    }

    const errors: string[] = [];

    try {
      validateEnvironment();
    } catch (error) {
      errors.push(`Environment validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    try {
      await validateTemporalConfig();
    } catch (error) {
      errors.push(`Temporal validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const isValid = errors.length === 0;
    
    // Update metadata
    if (this.config) {
      this.config.metadata.isValid = isValid;
      this.config.metadata.validationErrors = errors;
    }

    return { isValid, errors };
  }

  /**
   * Get configuration value by path (dot notation)
   * @param path Configuration path (e.g., 'environment.delayThresholdMinutes')
   * @param defaultValue Default value if path not found
   * @returns Configuration value
   */
  public getConfigValue<T = any>(path: string, defaultValue?: T): T | undefined {
    if (!this.config) {
      return defaultValue;
    }

    const keys = path.split('.');
    let current: any = this.config;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return defaultValue;
      }
    }

    return current as T;
  }

  /**
   * Check if configuration is loaded and valid
   * @returns True if configuration is loaded and valid
   */
  public isConfigurationValid(): boolean {
    return this.isLoaded && this.config !== null && this.config.metadata.isValid;
  }

  /**
   * Get configuration metadata
   * @returns Configuration metadata or null if not loaded
   */
  public getMetadata(): ConfigurationMetadata | null {
    return this.config?.metadata || null;
  }

  /**
   * Log configuration summary for debugging
   */
  private logConfigurationSummary(): void {
    if (!this.config) return;

    console.log('📊 Configuration Summary:');
    console.log(`  Environment: ${this.config.environment.nodeEnv}`);
    console.log(`  Delay Threshold: ${this.config.environment.delayThresholdMinutes} minutes`);
    console.log(`  Max Retries: ${this.config.environment.maxRetryAttempts}`);
    console.log(`  Activity Timeout: ${this.config.environment.activityTimeoutSeconds}s`);
    console.log(`  Workflow Timeout: ${this.config.environment.workflowTimeoutSeconds}s`);
    console.log(`  Temporal Server: ${this.config.temporal.serverUrl}`);
    console.log(`  Temporal Namespace: ${this.config.temporal.namespace}`);
    console.log(`  Task Queue: ${this.config.temporal.taskQueue}`);
    console.log(`  Debug Logging: ${this.config.environment.debugLogging ? 'enabled' : 'disabled'}`);
    console.log(`  Loaded At: ${this.config.metadata.loadedAt.toISOString()}`);
  }

  /**
   * Reset configuration manager (mainly for testing)
   */
  public reset(): void {
    this.config = null;
    this.isLoaded = false;
  }
}

// Export singleton instance
export const configManager = ConfigurationManager.getInstance();

/**
 * Convenience function to load configuration
 * @param options Configuration loading options
 * @returns Complete application configuration
 */
export async function loadApplicationConfig(options: ConfigurationOptions = {}): Promise<ApplicationConfig> {
  return await configManager.loadConfiguration(options);
}

/**
 * Convenience function to get current configuration
 * @param options Configuration loading options
 * @returns Current application configuration
 */
export async function getApplicationConfig(options: ConfigurationOptions = {}): Promise<ApplicationConfig> {
  return await configManager.getConfiguration(options);
}

/**
 * Convenience function to validate configuration
 * @returns Validation result
 */
export async function validateApplicationConfig(): Promise<{ isValid: boolean; errors: string[] }> {
  return await configManager.validateConfiguration();
}

/**
 * Get complete configuration help text
 * @returns Help text for all configuration options
 */
export function getCompleteConfigurationHelp(): string {
  const lines = [
    'Freight Delay Monitor - Complete Configuration Guide',
    '=' .repeat(60),
    '',
    getConfigurationHelp(),
    '',
    getTemporalConfigurationHelp(),
    '',
    'Configuration Loading:',
    '  The application automatically loads configuration from environment variables.',
    '  Create a .env file in the project root with the required variables.',
    '  All configuration is validated on startup with detailed error messages.',
    '',
    'Validation:',
    '  - API keys are validated for correct format and length',
    '  - Numeric values are checked for valid ranges',
    '  - Temporal server connectivity is tested during validation',
    '  - Missing required variables will prevent application startup',
    '',
    'Debugging:',
    '  Set DEBUG_LOGGING=true to enable detailed configuration logging.',
    '  Use the configuration manager to inspect loaded values at runtime.'
  ];
  
  return lines.join('\n');
}

// Export types and classes
export { ConfigurationError, ConfigurationManager };