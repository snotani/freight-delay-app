import { Worker } from '@temporalio/worker';
import { loadTemporalConfig, createTemporalConnection, createWorkerOptions } from './config/temporal-config';
import { validateEnvironment } from './config/environment';
import { logSystemStartup, logSystemShutdown, createLogger } from './utilities/logging';
import * as activities from './activities';

/**
 * Freight Delay Monitor Temporal Worker
 * 
 * This worker registers workflows and activities with Temporal server,
 * handles the execution of freight delay monitoring workflows,
 * and provides graceful shutdown capabilities.
 */

let worker: Worker | null = null;
let isShuttingDown = false;
const logger = createLogger('FreightDelayWorker');

/**
 * Initialize and start the Temporal worker
 * @returns Promise that resolves when worker is running
 */
async function startWorker(): Promise<void> {
  try {
    logger.info('🚀 Starting Freight Delay Monitor Worker');
    
    // Validate environment configuration
    validateEnvironment();
    logger.info('✅ Environment validation completed');
    
    // Load Temporal configuration
    const temporalConfig = loadTemporalConfig();
    logger.info('📋 Temporal configuration loaded', {
      serverUrl: temporalConfig.serverUrl,
      namespace: temporalConfig.namespace,
      taskQueue: temporalConfig.taskQueue
    });
    
    // Create connection to Temporal server
    logger.info('🔌 Connecting to Temporal server');
    const connection = await createTemporalConnection(temporalConfig);
    logger.info('✅ Connected to Temporal server successfully');
    
    // Create worker options from configuration
    const workerOptions = createWorkerOptions(temporalConfig);
    
    // Create and configure worker
    logger.info('⚙️ Creating Temporal worker');
    worker = await Worker.create({
      connection,
      namespace: temporalConfig.namespace,
      taskQueue: temporalConfig.taskQueue,
      workflowsPath: require.resolve('./workflows'),
      activities,
      ...workerOptions,
    });
    
    const registeredActivities = Object.keys(activities);
    logger.info('🏭 Worker created successfully', {
      taskQueue: temporalConfig.taskQueue,
      namespace: temporalConfig.namespace,
      maxConcurrentActivityTaskExecutions: workerOptions.maxConcurrentActivityTaskExecutions,
      maxConcurrentWorkflowTaskExecutions: workerOptions.maxConcurrentWorkflowTaskExecutions,
      registeredActivities,
      activityCount: registeredActivities.length
    });
    
    // Start the worker
    logger.info('▶️ Starting worker execution');
    await worker.run();
    
  } catch (error) {
    logger.fatal('❌ Failed to start worker', error as Error, {
      errorType: error instanceof Error ? error.constructor.name : 'Unknown'
    });
    
    // Cleanup on startup failure
    await cleanup();
    process.exit(1);
  }
}

/**
 * Gracefully shutdown the worker
 * @returns Promise that resolves when shutdown is complete
 */
async function shutdown(): Promise<void> {
  if (isShuttingDown) {
    logger.warn('⏳ Shutdown already in progress');
    return;
  }
  
  isShuttingDown = true;
  logger.info('🛑 Initiating graceful shutdown');
  
  if (worker) {
    try {
      logger.info('⏹️ Stopping worker');
      worker.shutdown();
      logger.info('✅ Worker stopped successfully');
    } catch (error) {
      logger.error('❌ Error during worker shutdown', error as Error);
    }
  }
  
  await cleanup();
  logger.info('👋 Shutdown complete');
}

/**
 * Cleanup resources
 * @returns Promise that resolves when cleanup is complete
 */
async function cleanup(): Promise<void> {
  // Additional cleanup logic can be added here
  // For example: closing database connections, clearing timers, etc.
  worker = null;
}

/**
 * Setup graceful shutdown handlers for various signals
 */
function setupShutdownHandlers(): void {
  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', async () => {
    logger.info('\n📡 Received SIGINT signal');
    logSystemShutdown('FreightDelayWorker', 'SIGINT signal received');
    await shutdown();
    process.exit(0);
  });
  
  // Handle SIGTERM (termination signal)
  process.on('SIGTERM', async () => {
    logger.info('📡 Received SIGTERM signal');
    logSystemShutdown('FreightDelayWorker', 'SIGTERM signal received');
    await shutdown();
    process.exit(0);
  });
  
  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    logger.fatal('💥 Uncaught Exception', error);
    logSystemShutdown('FreightDelayWorker', 'Uncaught exception');
    await shutdown();
    process.exit(1);
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', async (reason, promise) => {
    logger.fatal('💥 Unhandled Rejection', reason instanceof Error ? reason : new Error(String(reason)), {
      promise: String(promise)
    });
    logSystemShutdown('FreightDelayWorker', 'Unhandled promise rejection');
    await shutdown();
    process.exit(1);
  });
}

/**
 * Main function to start the worker with proper error handling
 */
async function main(): Promise<void> {
  // Log system startup information
  logSystemStartup('FreightDelayWorker', {
    nodeVersion: process.version,
    workingDirectory: process.cwd(),
    processId: process.pid,
    memoryUsage: process.memoryUsage()
  });
  
  // Setup graceful shutdown handlers
  setupShutdownHandlers();
  
  // Start the worker
  await startWorker();
}

// Start the worker if this file is run directly
if (require.main === module) {
  main().catch(async (error) => {
    logger.fatal('💥 Fatal error starting worker', error as Error);
    logSystemShutdown('FreightDelayWorker', 'Fatal startup error');
    await cleanup();
    process.exit(1);
  });
}

// Export functions for testing and external usage
export {
  startWorker,
  shutdown,
  cleanup
};