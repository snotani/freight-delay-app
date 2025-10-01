/**
 * Comprehensive logging and monitoring utilities for Freight Delay Monitor
 * Provides structured logging, metrics tracking, and consistent output formatting
 */

/**
 * Log levels for controlling output verbosity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

/**
 * Log entry structure for consistent formatting
 */
export interface LogEntry {
  timestamp: string;
  level: string;
  component: string;
  message: string;
  metadata?: Record<string, any>;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Metrics data structure for performance monitoring
 */
export interface MetricsData {
  component: string;
  operation: string;
  duration: number;
  success: boolean;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Configuration for the logger
 */
export interface LoggerConfig {
  level: LogLevel;
  enableMetrics: boolean;
  enableDebug: boolean;
  component: string;
}

/**
 * Default logger configuration
 */
const DEFAULT_CONFIG: LoggerConfig = {
  level: LogLevel.INFO,
  enableMetrics: true,
  enableDebug: process.env.NODE_ENV === 'development',
  component: 'FreightDelayMonitor'
};

/**
 * Global metrics storage for tracking performance
 */
const metricsStore: MetricsData[] = [];

/**
 * Structured logger class with comprehensive monitoring capabilities
 */
export class Logger {
  private config: LoggerConfig;
  private component: string;

  constructor(component: string, config: Partial<LoggerConfig> = {}) {
    this.component = component;
    this.config = { ...DEFAULT_CONFIG, ...config, component };
  }

  /**
   * Creates a formatted timestamp string
   */
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Formats log entry for consistent output
   */
  private formatLogEntry(entry: LogEntry): string {
    const { timestamp, level, component, message, metadata, duration, error } = entry;
    
    let logLine = `[${timestamp}] ${level.padEnd(5)} [${component}] ${message}`;
    
    if (duration !== undefined) {
      logLine += ` (${duration}ms)`;
    }
    
    if (metadata && Object.keys(metadata).length > 0) {
      logLine += ` | ${JSON.stringify(metadata)}`;
    }
    
    if (error) {
      logLine += `\n  Error: ${error.name}: ${error.message}`;
      if (error.stack && this.config.enableDebug) {
        logLine += `\n  Stack: ${error.stack}`;
      }
    }
    
    return logLine;
  }

  /**
   * Logs a message at the specified level
   */
  private log(level: LogLevel, message: string, metadata?: Record<string, any>, duration?: number, error?: Error): void {
    if (level < this.config.level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: this.getTimestamp(),
      level: LogLevel[level],
      component: this.component,
      message,
      metadata,
      duration,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    };

    const formattedLog = this.formatLogEntry(entry);
    
    // Output to appropriate console method based on level
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedLog);
        break;
      case LogLevel.INFO:
        console.info(formattedLog);
        break;
      case LogLevel.WARN:
        console.warn(formattedLog);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(formattedLog);
        break;
    }
  }

  /**
   * Debug level logging (only shown in development)
   */
  debug(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  /**
   * Info level logging for general information
   */
  info(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  /**
   * Warning level logging for non-critical issues
   */
  warn(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  /**
   * Error level logging for errors and exceptions
   */
  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, metadata, undefined, error);
  }

  /**
   * Fatal level logging for critical system failures
   */
  fatal(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.log(LogLevel.FATAL, message, metadata, undefined, error);
  }

  /**
   * Logs operation completion with duration
   */
  operation(message: string, duration: number, success: boolean = true, metadata?: Record<string, any>): void {
    const level = success ? LogLevel.INFO : LogLevel.WARN;
    const statusMessage = `${message} ${success ? 'completed' : 'failed'}`;
    
    this.log(level, statusMessage, metadata, duration);
    
    // Record metrics if enabled
    if (this.config.enableMetrics) {
      this.recordMetric(message, duration, success, metadata);
    }
  }

  /**
   * Records performance metrics
   */
  private recordMetric(operation: string, duration: number, success: boolean, metadata?: Record<string, any>): void {
    const metric: MetricsData = {
      component: this.component,
      operation,
      duration,
      success,
      timestamp: this.getTimestamp(),
      metadata
    };
    
    metricsStore.push(metric);
    
    // Keep only last 1000 metrics to prevent memory issues
    if (metricsStore.length > 1000) {
      metricsStore.splice(0, metricsStore.length - 1000);
    }
  }

  /**
   * Logs API call metrics with response time and status
   */
  apiCall(apiName: string, duration: number, success: boolean, statusCode?: number, metadata?: Record<string, any>): void {
    const apiMetadata = {
      ...metadata,
      statusCode,
      apiName
    };
    
    const message = `API call to ${apiName}`;
    this.operation(message, duration, success, apiMetadata);
  }

  /**
   * Logs workflow step completion
   */
  workflowStep(stepName: string, stepNumber: number, duration: number, success: boolean = true, metadata?: Record<string, any>): void {
    const stepMetadata = {
      ...metadata,
      stepNumber,
      stepName
    };
    
    const message = `Workflow step ${stepNumber}: ${stepName}`;
    this.operation(message, duration, success, stepMetadata);
  }

  /**
   * Logs delay analysis results
   */
  delayAnalysis(delayMinutes: number, threshold: number, exceedsThreshold: boolean, metadata?: Record<string, any>): void {
    const analysisMetadata = {
      ...metadata,
      delayMinutes,
      threshold,
      exceedsThreshold,
      delayPercentage: threshold > 0 ? Math.round((delayMinutes / threshold) * 100) : 0
    };
    
    const severity = this.getDelaySeverity(delayMinutes);
    const message = `Delay analysis: ${delayMinutes}min (${severity}) - ${exceedsThreshold ? 'EXCEEDS' : 'WITHIN'} threshold`;
    
    const level = exceedsThreshold ? LogLevel.WARN : LogLevel.INFO;
    this.log(level, message, analysisMetadata);
  }

  /**
   * Logs notification delivery status
   */
  notificationStatus(customerId: string, customerEmail: string, success: boolean, duration: number, messageId?: string, metadata?: Record<string, any>): void {
    const notificationMetadata = {
      ...metadata,
      customerId,
      customerEmail,
      messageId,
      deliveryStatus: success ? 'delivered' : 'failed'
    };
    
    const message = `Notification ${success ? 'delivered' : 'failed'} to ${customerEmail}`;
    this.operation(message, duration, success, notificationMetadata);
  }

  /**
   * Determines delay severity classification
   */
  private getDelaySeverity(delayMinutes: number): string {
    if (delayMinutes === 0) return 'NONE';
    if (delayMinutes <= 10) return 'MINIMAL';
    if (delayMinutes <= 20) return 'LOW';
    if (delayMinutes <= 30) return 'MODERATE';
    if (delayMinutes <= 60) return 'HIGH';
    return 'CRITICAL';
  }
}

/**
 * Performance timer utility for measuring operation duration
 */
export class PerformanceTimer {
  private startTime: number;
  private logger: Logger;
  private operation: string;

  constructor(logger: Logger, operation: string) {
    this.logger = logger;
    this.operation = operation;
    this.startTime = Date.now();
    
    logger.debug(`Starting operation: ${operation}`);
  }

  /**
   * Completes the timer and logs the duration
   */
  complete(success: boolean = true, metadata?: Record<string, any>): number {
    const duration = Date.now() - this.startTime;
    this.logger.operation(this.operation, duration, success, metadata);
    return duration;
  }

  /**
   * Gets the current elapsed time without completing the timer
   */
  getElapsed(): number {
    return Date.now() - this.startTime;
  }
}

/**
 * Creates a logger instance for a specific component
 */
export function createLogger(component: string, config?: Partial<LoggerConfig>): Logger {
  return new Logger(component, config);
}

/**
 * Creates a performance timer for measuring operation duration
 */
export function createTimer(logger: Logger, operation: string): PerformanceTimer {
  return new PerformanceTimer(logger, operation);
}

/**
 * Gets current metrics summary for monitoring
 */
export function getMetricsSummary(): {
  totalOperations: number;
  successRate: number;
  averageDuration: number;
  recentMetrics: MetricsData[];
} {
  const total = metricsStore.length;
  const successful = metricsStore.filter(m => m.success).length;
  const totalDuration = metricsStore.reduce((sum, m) => sum + m.duration, 0);
  
  return {
    totalOperations: total,
    successRate: total > 0 ? (successful / total) * 100 : 0,
    averageDuration: total > 0 ? totalDuration / total : 0,
    recentMetrics: metricsStore.slice(-10) // Last 10 metrics
  };
}

/**
 * Gets metrics for a specific component
 */
export function getComponentMetrics(component: string): MetricsData[] {
  return metricsStore.filter(m => m.component === component);
}

/**
 * Clears all stored metrics (useful for testing)
 */
export function clearMetrics(): void {
  metricsStore.length = 0;
}

/**
 * Logs system startup information
 */
export function logSystemStartup(component: string, config?: Record<string, any>): void {
  const logger = createLogger(component);
  
  logger.info('System starting up', {
    nodeVersion: process.version,
    platform: process.platform,
    architecture: process.arch,
    workingDirectory: process.cwd(),
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    ...config
  });
}

/**
 * Logs system shutdown information
 */
export function logSystemShutdown(component: string, reason?: string): void {
  const logger = createLogger(component);
  
  logger.info('System shutting down', {
    reason: reason || 'Normal shutdown',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
}

/**
 * Logs workflow completion status with comprehensive details
 */
export function logWorkflowCompletion(
  workflowId: string,
  success: boolean,
  duration: number,
  result?: any,
  error?: Error,
  metadata?: Record<string, any>
): void {
  const logger = createLogger('WorkflowExecution');
  
  const completionMetadata = {
    ...metadata,
    workflowId,
    duration,
    success,
    result: success ? result : undefined,
    completedAt: new Date().toISOString()
  };
  
  if (success) {
    logger.info(`Workflow completed successfully`, completionMetadata);
  } else {
    logger.error(`Workflow failed`, error, completionMetadata);
  }
}