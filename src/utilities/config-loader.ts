import {
  loadApplicationConfig,
  getApplicationConfig,
  validateApplicationConfig,
  getCompleteConfigurationHelp,
  configManager,
  ConfigurationError,
  type ApplicationConfig,
  type ConfigurationOptions
} from '../config';

/**
 * Configuration loader utility with enhanced error handling and logging
 */
export class ConfigurationLoader {
  private static instance: ConfigurationLoader;
  private config: ApplicationConfig | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): ConfigurationLoader {
    if (!ConfigurationLoader.instance) {
      ConfigurationLoader.instance = new ConfigurationLoader();
    }
    return ConfigurationLoader.instance;
  }

  /**
   * Initialize application configuration with comprehensive error handling
   * @param options Configuration loading options
   * @returns Promise resolving to loaded configuration
   */
  public async initialize(options: ConfigurationOptions = {}): Promise<ApplicationConfig> {
    const { verbose = true } = options;

    try {
      if (verbose) {
        console.log('🚀 Initializing Freight Delay Monitor configuration...');
      }

      // Load configuration
      this.config = await loadApplicationConfig({ ...options, verbose });

      if (verbose) {
        console.log('✅ Configuration initialized successfully');
        this.logConfigurationStatus();
      }

      return this.config;
    } catch (error) {
      console.error('❌ Failed to initialize configuration:');
      
      if (error instanceof ConfigurationError) {
        console.error(`Configuration Error: ${error.message}`);
        
        if (error.field) {
          console.error(`Field: ${error.field}`);
          console.error(`Value: ${error.value}`);
          console.error(`Expected: ${error.expectedType}`);
        }
      } else {
        console.error(`Unexpected Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Provide helpful guidance
      console.error('\n💡 Configuration Help:');
      console.error('Run the following command to see all configuration options:');
      console.error('node -e "console.log(require(\'./dist/config\').getCompleteConfigurationHelp())"');
      console.error('\nOr check the .env.example file for required environment variables.');

      throw error;
    }
  }

  /**
   * Get current configuration (initialize if needed)
   * @param options Configuration options
   * @returns Current configuration
   */
  public async getConfig(options: ConfigurationOptions = {}): Promise<ApplicationConfig> {
    if (!this.config) {
      return await this.initialize(options);
    }
    return this.config;
  }

  /**
   * Validate current configuration and report status
   * @returns Validation result with detailed reporting
   */
  public async validateConfig(): Promise<{ isValid: boolean; errors: string[] }> {
    try {
      console.log('🔍 Validating configuration...');
      
      const result = await validateApplicationConfig();
      
      if (result.isValid) {
        console.log('✅ Configuration validation passed');
      } else {
        console.error('❌ Configuration validation failed:');
        result.errors.forEach(error => console.error(`  - ${error}`));
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Configuration validation error: ${errorMessage}`);
      return { isValid: false, errors: [errorMessage] };
    }
  }

  /**
   * Get configuration value with type safety and defaults
   * @param path Configuration path
   * @param defaultValue Default value
   * @returns Configuration value
   */
  public getConfigValue<T = any>(path: string, defaultValue?: T): T | undefined {
    return configManager.getConfigValue(path, defaultValue);
  }

  /**
   * Check if configuration is ready for use
   * @returns True if configuration is loaded and valid
   */
  public isReady(): boolean {
    return configManager.isConfigurationValid();
  }

  /**
   * Reload configuration from environment
   * @param options Configuration options
   * @returns Reloaded configuration
   */
  public async reload(options: ConfigurationOptions = {}): Promise<ApplicationConfig> {
    console.log('🔄 Reloading configuration...');
    this.config = await configManager.reloadConfiguration(options);
    console.log('✅ Configuration reloaded successfully');
    return this.config;
  }

  /**
   * Log current configuration status
   */
  private logConfigurationStatus(): void {
    if (!this.config) return;

    const metadata = this.config.metadata;
    console.log('📊 Configuration Status:');
    console.log(`  ✓ Loaded at: ${metadata.loadedAt.toISOString()}`);
    console.log(`  ✓ Source: ${metadata.source}`);
    console.log(`  ✓ Version: ${metadata.version}`);
    console.log(`  ✓ Valid: ${metadata.isValid ? 'Yes' : 'No'}`);
    
    if (metadata.validationErrors.length > 0) {
      console.log('  ⚠️  Validation errors:');
      metadata.validationErrors.forEach(error => console.log(`    - ${error}`));
    }
  }

  /**
   * Print configuration help
   */
  public static printHelp(): void {
    console.log(getCompleteConfigurationHelp());
  }

  /**
   * Create a configuration summary for logging
   * @returns Configuration summary object
   */
  public getConfigSummary(): Record<string, any> | null {
    if (!this.config) return null;

    return {
      environment: this.config.environment.nodeEnv,
      delayThreshold: `${this.config.environment.delayThresholdMinutes} minutes`,
      maxRetries: this.config.environment.maxRetryAttempts,
      activityTimeout: `${this.config.environment.activityTimeoutSeconds}s`,
      workflowTimeout: `${this.config.environment.workflowTimeoutSeconds}s`,
      debugLogging: this.config.environment.debugLogging,
      temporalServer: this.config.temporal.serverUrl,
      temporalNamespace: this.config.temporal.namespace,
      taskQueue: this.config.temporal.taskQueue,
      loadedAt: this.config.metadata.loadedAt.toISOString(),
      isValid: this.config.metadata.isValid
    };
  }
}

// Export singleton instance
export const configLoader = ConfigurationLoader.getInstance();

/**
 * Convenience function to initialize configuration
 * @param options Configuration options
 * @returns Loaded configuration
 */
export async function initializeConfig(options: ConfigurationOptions = {}): Promise<ApplicationConfig> {
  return await configLoader.initialize(options);
}

/**
 * Convenience function to get configuration
 * @param options Configuration options
 * @returns Current configuration
 */
export async function getConfig(options: ConfigurationOptions = {}): Promise<ApplicationConfig> {
  return await configLoader.getConfig(options);
}

/**
 * Convenience function to validate configuration
 * @returns Validation result
 */
export async function validateConfig(): Promise<{ isValid: boolean; errors: string[] }> {
  return await configLoader.validateConfig();
}

/**
 * Print configuration help to console
 */
export function printConfigHelp(): void {
  ConfigurationLoader.printHelp();
}

/**
 * Check if configuration is ready
 * @returns True if ready
 */
export function isConfigReady(): boolean {
  return configLoader.isReady();
}

/**
 * Get configuration summary for logging
 * @returns Configuration summary
 */
export function getConfigSummary(): Record<string, any> | null {
  return configLoader.getConfigSummary();
}