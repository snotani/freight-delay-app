#!/usr/bin/env node

/**
 * Complete Freight Delay Monitor Workflow Demonstration
 * 
 * This comprehensive example demonstrates all aspects of the freight delay monitoring system:
 * - Setting up the Temporal worker and client
 * - Configuring API integrations (Google Maps, OpenAI, SendGrid)
 * - Executing workflows with different scenarios
 * - Monitoring workflow progress and results
 * - Error handling and fallback mechanisms
 * - Performance monitoring and logging
 * 
 * Usage:
 *   npm run demo
 *   npx ts-node src/examples/complete-workflow-demo.ts
 */

import { FreightDelayMonitorClient, executeWorkflow, monitorWorkflow } from '../client';
import { DeliveryRoute } from '../types/delivery-route';
import { WorkflowConfig } from '../types/workflow-config';
import { createLogger, logSystemStartup, logSystemShutdown, getMetricsSummary } from '../utilities/logging';
import { sampleRoutes, sampleCustomers, sampleConfigs, testScenarios } from './sample-data';

// Initialize logger for the demo
const logger = createLogger('WorkflowDemo');

/**
 * Demo configuration with various scenarios to test
 */
interface DemoScenario {
  name: string;
  description: string;
  route: DeliveryRoute;
  customer: { customerId: string; customerEmail: string };
  config: WorkflowConfig;
  expectedOutcome: 'delay_detected' | 'no_delay' | 'error_handling';
}

/**
 * Predefined demo scenarios showcasing different system behaviors
 */
const demoScenarios: DemoScenario[] = [
  {
    name: 'Standard Route Monitoring',
    description: 'Monitor a typical delivery route with standard delay threshold',
    route: sampleRoutes[0], // SF-SJ-001
    customer: { customerId: sampleCustomers[0].customerId, customerEmail: sampleCustomers[0].customerEmail },
    config: sampleConfigs.standard,
    expectedOutcome: 'delay_detected'
  },
  {
    name: 'Priority Delivery Monitoring',
    description: 'Monitor a priority delivery with lower delay threshold',
    route: sampleRoutes[2], // PA-RC-003 (short route)
    customer: { customerId: sampleCustomers[1].customerId, customerEmail: sampleCustomers[1].customerEmail },
    config: sampleConfigs.priority,
    expectedOutcome: 'delay_detected'
  },
  {
    name: 'Relaxed Monitoring',
    description: 'Monitor with high delay threshold - likely no notification',
    route: sampleRoutes[4], // SJ-SC-005 (very short route)
    customer: { customerId: sampleCustomers[2].customerId, customerEmail: sampleCustomers[2].customerEmail },
    config: sampleConfigs.relaxed,
    expectedOutcome: 'no_delay'
  },
  {
    name: 'Express Delivery',
    description: 'Monitor express delivery with very low delay threshold',
    route: sampleRoutes[1], // OAK-BRK-002
    customer: { customerId: sampleCustomers[3].customerId, customerEmail: sampleCustomers[3].customerEmail },
    config: sampleConfigs.express,
    expectedOutcome: 'delay_detected'
  },
  {
    name: 'Bulk Delivery',
    description: 'Monitor bulk delivery with high delay tolerance',
    route: sampleRoutes[5], // LA-LB-006
    customer: { customerId: sampleCustomers[4].customerId, customerEmail: sampleCustomers[4].customerEmail },
    config: sampleConfigs.bulk,
    expectedOutcome: 'no_delay'
  }
];

/**
 * Validates that all required environment variables are set
 * @returns true if all required variables are present, false otherwise
 */
function validateEnvironment(): boolean {
  const requiredVars = [
    'GOOGLE_MAPS_API_KEY',
    'OPENAI_API_KEY',
    'SENDGRID_API_KEY'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    logger.error('Missing required environment variables', undefined, {
      missingVariables: missingVars,
      requiredVariables: requiredVars
    });
    return false;
  }

  logger.info('Environment validation successful', {
    configuredVariables: requiredVars,
    temporalServer: process.env.TEMPORAL_SERVER_URL || 'localhost:7233',
    logLevel: process.env.LOG_LEVEL || 'info'
  });

  return true;
}

/**
 * Displays system information and configuration
 */
function displaySystemInfo(): void {
  console.log('\n🚛 Freight Delay Monitor - Complete Workflow Demonstration');
  console.log('=========================================================');
  console.log(`📅 Demo started at: ${new Date().toISOString()}`);
  console.log(`🖥️  Node.js version: ${process.version}`);
  console.log(`🌍 Platform: ${process.platform} (${process.arch})`);
  console.log(`📁 Working directory: ${process.cwd()}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🏢 Temporal server: ${process.env.TEMPORAL_SERVER_URL || 'localhost:7233'}`);
  console.log(`📊 Log level: ${process.env.LOG_LEVEL || 'info'}`);
  console.log('');
}

/**
 * Displays available demo scenarios
 */
function displayDemoScenarios(): void {
  console.log('📋 Available Demo Scenarios:');
  console.log('============================');
  
  demoScenarios.forEach((scenario, index) => {
    console.log(`${index + 1}. ${scenario.name}`);
    console.log(`   Description: ${scenario.description}`);
    console.log(`   Route: ${scenario.route.routeId} (${scenario.route.origin} → ${scenario.route.destination})`);
    console.log(`   Customer: ${scenario.customer.customerId} (${scenario.customer.customerEmail})`);
    console.log(`   Threshold: ${scenario.config.delayThresholdMinutes} minutes`);
    console.log(`   Expected: ${scenario.expectedOutcome.replace('_', ' ')}`);
    console.log('');
  });
}

/**
 * Executes a single demo scenario with comprehensive monitoring
 * @param scenario - The demo scenario to execute
 * @param scenarioIndex - Index of the scenario for display purposes
 * @returns Promise resolving to execution result
 */
async function executeDemoScenario(scenario: DemoScenario, scenarioIndex: number): Promise<any> {
  const scenarioLogger = createLogger(`Scenario${scenarioIndex + 1}`);
  
  console.log(`\n🎬 Executing Scenario ${scenarioIndex + 1}: ${scenario.name}`);
  console.log('─'.repeat(60));
  
  scenarioLogger.info('Starting demo scenario execution', {
    scenarioName: scenario.name,
    routeId: scenario.route.routeId,
    customerId: scenario.customer.customerId,
    delayThreshold: scenario.config.delayThresholdMinutes,
    expectedOutcome: scenario.expectedOutcome
  });

  try {
    // Generate unique workflow ID for this scenario
    const workflowId = `demo-${scenario.route.routeId}-${Date.now()}`;
    
    console.log(`📍 Route: ${scenario.route.origin} → ${scenario.route.destination}`);
    console.log(`👤 Customer: ${scenario.customer.customerId} (${scenario.customer.customerEmail})`);
    console.log(`⏱️  Baseline time: ${scenario.route.baselineTimeMinutes} minutes`);
    console.log(`🚨 Delay threshold: ${scenario.config.delayThresholdMinutes} minutes`);
    console.log(`🆔 Workflow ID: ${workflowId}`);
    console.log('');

    // Execute the workflow
    const startTime = Date.now();
    console.log('🚀 Starting workflow execution...');
    
    const result = await executeWorkflow(
      scenario.route,
      scenario.customer,
      scenario.config,
      {
        workflowId,
        taskQueue: 'freight-delay-monitor'
      }
    );

    const duration = Date.now() - startTime;
    
    // Display results
    console.log('✅ Workflow completed successfully!');
    console.log('📊 Results:');
    console.log(`   • Delay detected: ${result.delayDetected ? '🔴 YES' : '🟢 NO'}`);
    console.log(`   • Delay amount: ${result.delayMinutes} minutes`);
    console.log(`   • Notification sent: ${result.notificationSent ? '📧 YES' : '❌ NO'}`);
    console.log(`   • Execution time: ${duration}ms`);
    console.log(`   • Completed at: ${result.completedAt.toISOString()}`);
    
    if (result.errorMessage) {
      console.log(`   • Error: ${result.errorMessage}`);
    }

    // Validate expected outcome
    const actualOutcome = result.delayDetected ? 'delay_detected' : 'no_delay';
    const outcomeMatches = actualOutcome === scenario.expectedOutcome;
    
    console.log(`   • Expected outcome: ${scenario.expectedOutcome.replace('_', ' ')}`);
    console.log(`   • Actual outcome: ${actualOutcome.replace('_', ' ')}`);
    console.log(`   • Outcome matches: ${outcomeMatches ? '✅ YES' : '⚠️  NO'}`);

    scenarioLogger.info('Demo scenario completed', {
      scenarioName: scenario.name,
      workflowId,
      duration,
      delayDetected: result.delayDetected,
      delayMinutes: result.delayMinutes,
      notificationSent: result.notificationSent,
      expectedOutcome: scenario.expectedOutcome,
      actualOutcome,
      outcomeMatches,
      success: true
    });

    return {
      scenario: scenario.name,
      workflowId,
      duration,
      result,
      outcomeMatches,
      success: true
    };

  } catch (error) {
    const duration = Date.now() - Date.now();
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.log('❌ Workflow execution failed!');
    console.log(`   • Error: ${errorMessage}`);
    console.log(`   • Duration: ${duration}ms`);

    scenarioLogger.error('Demo scenario failed', error as Error, {
      scenarioName: scenario.name,
      duration,
      errorMessage
    });

    return {
      scenario: scenario.name,
      duration,
      error: errorMessage,
      success: false
    };
  }
}

/**
 * Executes all demo scenarios sequentially
 * @returns Promise resolving to array of execution results
 */
async function executeAllScenarios(): Promise<any[]> {
  console.log('\n🎯 Executing All Demo Scenarios');
  console.log('================================');
  
  const results: any[] = [];
  
  for (let i = 0; i < demoScenarios.length; i++) {
    const scenario = demoScenarios[i];
    
    try {
      const result = await executeDemoScenario(scenario, i);
      results.push(result);
      
      // Wait between scenarios to avoid overwhelming APIs
      if (i < demoScenarios.length - 1) {
        console.log('\n⏳ Waiting 5 seconds before next scenario...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
    } catch (error) {
      logger.error(`Failed to execute scenario ${i + 1}`, error as Error, {
        scenarioName: scenario.name
      });
      
      results.push({
        scenario: scenario.name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  return results;
}

/**
 * Displays comprehensive demo summary and metrics
 * @param results - Array of execution results from all scenarios
 */
function displayDemoSummary(results: any[]): void {
  console.log('\n📈 Demo Execution Summary');
  console.log('=========================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const outcomeMatches = results.filter(r => r.outcomeMatches);
  
  console.log(`📊 Overall Statistics:`);
  console.log(`   • Total scenarios: ${results.length}`);
  console.log(`   • Successful executions: ${successful.length}`);
  console.log(`   • Failed executions: ${failed.length}`);
  console.log(`   • Success rate: ${((successful.length / results.length) * 100).toFixed(1)}%`);
  console.log(`   • Expected outcomes matched: ${outcomeMatches.length}/${results.length}`);
  
  if (successful.length > 0) {
    const totalDuration = successful.reduce((sum, r) => sum + r.duration, 0);
    const avgDuration = totalDuration / successful.length;
    const delayDetections = successful.filter(r => r.result?.delayDetected).length;
    const notificationsSent = successful.filter(r => r.result?.notificationSent).length;
    
    console.log(`   • Average execution time: ${avgDuration.toFixed(0)}ms`);
    console.log(`   • Delays detected: ${delayDetections}/${successful.length}`);
    console.log(`   • Notifications sent: ${notificationsSent}/${successful.length}`);
  }
  
  console.log('\n📋 Scenario Results:');
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    const outcome = result.outcomeMatches ? '🎯' : '⚠️';
    
    console.log(`   ${index + 1}. ${status} ${outcome} ${result.scenario}`);
    
    if (result.success) {
      console.log(`      Duration: ${result.duration}ms, Delay: ${result.result.delayMinutes}min, Notification: ${result.result.notificationSent ? 'Sent' : 'Skipped'}`);
    } else {
      console.log(`      Error: ${result.error}`);
    }
  });
  
  // Display system metrics
  const metrics = getMetricsSummary();
  console.log('\n🔧 System Performance Metrics:');
  console.log(`   • Total operations: ${metrics.totalOperations}`);
  console.log(`   • Success rate: ${metrics.successRate.toFixed(1)}%`);
  console.log(`   • Average operation duration: ${metrics.averageDuration.toFixed(0)}ms`);
  
  console.log('\n🎉 Demo completed successfully!');
  console.log(`📅 Finished at: ${new Date().toISOString()}`);
}

/**
 * Demonstrates workflow monitoring capabilities
 * @returns Promise resolving when monitoring demo is complete
 */
async function demonstrateWorkflowMonitoring(): Promise<void> {
  console.log('\n👀 Workflow Monitoring Demonstration');
  console.log('====================================');
  
  let client: FreightDelayMonitorClient | null = null;
  
  try {
    // Create client and start a workflow for monitoring
    client = await FreightDelayMonitorClient.create();
    
    const monitoringScenario = demoScenarios[0];
    const workflowId = `monitoring-demo-${Date.now()}`;
    
    console.log('🚀 Starting workflow for monitoring demonstration...');
    console.log(`🆔 Workflow ID: ${workflowId}`);
    
    const handle = await client.startWorkflow(
      monitoringScenario.route,
      monitoringScenario.customer,
      monitoringScenario.config,
      { workflowId }
    );
    
    console.log('👀 Monitoring workflow status (will poll every 3 seconds)...');
    console.log('   Press Ctrl+C to stop monitoring\n');
    
    // Monitor workflow with polling
    let isRunning = true;
    let pollCount = 0;
    
    while (isRunning && pollCount < 20) { // Max 20 polls (1 minute)
      try {
        const status = await client.getWorkflowStatus(workflowId);
        const timestamp = new Date().toISOString();
        
        console.log(`[${timestamp}] Status: ${status.status}`);
        
        if (['COMPLETED', 'FAILED', 'CANCELLED', 'TERMINATED', 'TIMED_OUT'].includes(status.status)) {
          console.log('✅ Workflow reached terminal state');
          
          if (status.result) {
            console.log('📊 Final result:', {
              delayDetected: status.result.delayDetected,
              delayMinutes: status.result.delayMinutes,
              notificationSent: status.result.notificationSent
            });
          }
          
          isRunning = false;
        } else {
          await new Promise(resolve => setTimeout(resolve, 3000));
          pollCount++;
        }
        
      } catch (error) {
        console.error('❌ Error monitoring workflow:', error);
        isRunning = false;
      }
    }
    
    if (pollCount >= 20) {
      console.log('⏰ Monitoring timeout reached');
    }
    
  } catch (error) {
    logger.error('Workflow monitoring demonstration failed', error as Error);
    console.error('❌ Monitoring demonstration failed:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

/**
 * Demonstrates error handling and recovery mechanisms
 * @returns Promise resolving when error handling demo is complete
 */
async function demonstrateErrorHandling(): Promise<void> {
  console.log('\n🚨 Error Handling Demonstration');
  console.log('===============================');
  
  // Test with invalid route data
  console.log('🧪 Testing input validation...');
  
  try {
    await executeWorkflow(
      { routeId: '', origin: '', destination: '', baselineTimeMinutes: -1 } as any,
      { customerId: 'TEST', customerEmail: 'invalid-email' },
      { delayThresholdMinutes: -1, retryAttempts: -1, fallbackMessage: '' } as any
    );
  } catch (error) {
    console.log('✅ Input validation working correctly:', (error as Error).message);
  }
  
  // Test with invalid API configuration (if not in production)
  if (process.env.NODE_ENV !== 'production') {
    console.log('🧪 Testing API error handling...');
    
    // This would test API failures, but we'll skip in demo to avoid API quota usage
    console.log('⏭️  Skipping API error tests to preserve API quotas');
  }
  
  console.log('✅ Error handling demonstration completed');
}

/**
 * Main demo execution function
 */
async function runCompleteDemo(): Promise<void> {
  // Log system startup
  logSystemStartup('WorkflowDemo', {
    demoVersion: '1.0.0',
    scenarioCount: demoScenarios.length
  });
  
  try {
    // Display system information
    displaySystemInfo();
    
    // Validate environment
    if (!validateEnvironment()) {
      console.error('❌ Environment validation failed. Please check your .env file.');
      process.exit(1);
    }
    
    // Display available scenarios
    displayDemoScenarios();
    
    // Execute all scenarios
    const results = await executeAllScenarios();
    
    // Display comprehensive summary
    displayDemoSummary(results);
    
    // Demonstrate workflow monitoring
    await demonstrateWorkflowMonitoring();
    
    // Demonstrate error handling
    await demonstrateErrorHandling();
    
    console.log('\n🎊 Complete workflow demonstration finished successfully!');
    
  } catch (error) {
    logger.fatal('Demo execution failed', error as Error);
    console.error('💥 Demo execution failed:', error);
    process.exit(1);
  } finally {
    // Log system shutdown
    logSystemShutdown('WorkflowDemo', 'Demo completed');
  }
}

/**
 * Handle process signals for graceful shutdown
 */
process.on('SIGINT', () => {
  console.log('\n🛑 Demo interrupted by user');
  logSystemShutdown('WorkflowDemo', 'User interrupt (SIGINT)');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Demo terminated');
  logSystemShutdown('WorkflowDemo', 'Process terminated (SIGTERM)');
  process.exit(0);
});

// Run the demo if this file is executed directly
if (require.main === module) {
  runCompleteDemo().catch(error => {
    console.error('💥 Fatal error in demo execution:', error);
    process.exit(1);
  });
}

export {
  runCompleteDemo,
  executeDemoScenario,
  executeAllScenarios,
  demonstrateWorkflowMonitoring,
  demonstrateErrorHandling,
  demoScenarios
};