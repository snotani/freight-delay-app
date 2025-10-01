#!/usr/bin/env node

/**
 * CLI example for demonstrating freight delay monitoring workflow execution
 * 
 * Usage:
 *   npm run client
 *   ts-node src/cli-example.ts
 */

import { FreightDelayMonitorClient, executeWorkflow } from './client';
import { DeliveryRoute } from './types/delivery-route';
import { WorkflowConfig } from './types/workflow-config';

/**
 * Sample route data for demonstration
 */
const sampleRoutes: DeliveryRoute[] = [
  {
    routeId: 'SF-SJ-001',
    origin: '1600 Amphitheatre Parkway, Mountain View, CA',
    destination: '1 Hacker Way, Menlo Park, CA',
    baselineTimeMinutes: 45
  },
  {
    routeId: 'OAK-BRK-002',
    origin: 'Oakland, CA',
    destination: 'Berkeley, CA',
    baselineTimeMinutes: 25
  },
  {
    routeId: 'PA-RC-003',
    origin: 'Palo Alto, CA',
    destination: 'Redwood City, CA',
    baselineTimeMinutes: 20
  }
];

/**
 * Sample customer data
 */
const sampleCustomers = [
  {
    customerId: 'CUST-001',
    customerEmail: 'john.doe@example.com'
  },
  {
    customerId: 'CUST-002',
    customerEmail: 'jane.smith@example.com'
  },
  {
    customerId: 'CUST-003',
    customerEmail: 'bob.wilson@example.com'
  }
];

/**
 * Default workflow configuration
 */
const defaultConfig: WorkflowConfig = {
  delayThresholdMinutes: 30,
  retryAttempts: 3,
  fallbackMessage: 'We apologize, but your delivery to {destination} from {origin} is experiencing a delay of approximately {delayMinutes} minutes due to traffic conditions. We will keep you updated on any changes.'
};

/**
 * Display help information
 */
function displayHelp() {
  console.log(`
🚛 Freight Delay Monitor - CLI Example

Usage:
  npm run client [command] [options]

Commands:
  help                    Show this help message
  list-routes            List available sample routes
  execute <route-id>     Execute workflow for specific route
  execute-all            Execute workflows for all sample routes
  monitor <workflow-id>  Monitor existing workflow status

Options:
  --server <url>         Temporal server URL (default: localhost:7233)
  --namespace <name>     Temporal namespace (default: default)
  --threshold <minutes>  Delay threshold in minutes (default: 30)

Examples:
  npm run client execute SF-SJ-001
  npm run client execute-all --threshold 15
  npm run client monitor freight-delay-SF-SJ-001-1234567890
  npm run client list-routes
`);
}

/**
 * List available sample routes
 */
function listRoutes() {
  console.log('\n📍 Available Sample Routes:');
  console.log('==========================');
  
  sampleRoutes.forEach((route, index) => {
    console.log(`${index + 1}. Route ID: ${route.routeId}`);
    console.log(`   Origin: ${route.origin}`);
    console.log(`   Destination: ${route.destination}`);
    console.log(`   Baseline Time: ${route.baselineTimeMinutes} minutes`);
    console.log('');
  });
}

/**
 * Execute workflow for a specific route
 */
async function executeRoute(routeId: string, options: any = {}) {
  const route = sampleRoutes.find(r => r.routeId === routeId);
  if (!route) {
    console.error(`❌ Route not found: ${routeId}`);
    console.log('Available routes:');
    sampleRoutes.forEach(r => console.log(`  - ${r.routeId}`));
    return;
  }

  const customer = sampleCustomers[0]; // Use first customer for demo
  const config = {
    ...defaultConfig,
    delayThresholdMinutes: options.threshold || defaultConfig.delayThresholdMinutes
  };

  console.log(`\n🚀 Starting workflow for route: ${routeId}`);
  console.log(`📧 Customer: ${customer.customerEmail}`);
  console.log(`⏱️  Delay threshold: ${config.delayThresholdMinutes} minutes`);
  console.log('');

  try {
    const result = await executeWorkflow(
      route,
      customer,
      config,
      {
        workflowId: `cli-${routeId}-${Date.now()}`,
        taskQueue: 'freight-delay-monitor'
      },
      options.server || 'localhost:7233',
      options.namespace || 'default'
    );

    console.log('✅ Workflow completed successfully!');
    console.log('📊 Results:');
    console.log(`   Delay detected: ${result.delayDetected ? 'Yes' : 'No'}`);
    console.log(`   Delay amount: ${result.delayMinutes} minutes`);
    console.log(`   Notification sent: ${result.notificationSent ? 'Yes' : 'No'}`);
    console.log(`   Completed at: ${result.completedAt.toISOString()}`);
    
    if (result.errorMessage) {
      console.log(`   Error: ${result.errorMessage}`);
    }

  } catch (error) {
    console.error('❌ Workflow execution failed:', error);
  }
}

/**
 * Execute workflows for all sample routes
 */
async function executeAllRoutes(options: any = {}) {
  console.log('\n🚀 Starting workflows for all sample routes...\n');

  const config = {
    ...defaultConfig,
    delayThresholdMinutes: options.threshold || defaultConfig.delayThresholdMinutes
  };

  for (let i = 0; i < sampleRoutes.length; i++) {
    const route = sampleRoutes[i];
    const customer = sampleCustomers[i % sampleCustomers.length];

    console.log(`📍 Processing route ${i + 1}/${sampleRoutes.length}: ${route.routeId}`);
    
    try {
      const result = await executeWorkflow(
        route,
        customer,
        config,
        {
          workflowId: `cli-batch-${route.routeId}-${Date.now()}`,
          taskQueue: 'freight-delay-monitor'
        },
        options.server || 'localhost:7233',
        options.namespace || 'default'
      );

      console.log(`   ✅ Completed - Delay: ${result.delayMinutes}min, Notification: ${result.notificationSent ? 'Sent' : 'Skipped'}`);
      
    } catch (error) {
      console.log(`   ❌ Failed: ${error}`);
    }
    
    console.log('');
  }

  console.log('🎉 All workflows completed!');
}

/**
 * Monitor an existing workflow
 */
async function monitorWorkflow(workflowId: string, options: any = {}) {
  console.log(`\n👀 Monitoring workflow: ${workflowId}`);
  console.log('Press Ctrl+C to stop monitoring\n');

  let client: FreightDelayMonitorClient | null = null;

  try {
    client = await FreightDelayMonitorClient.create(
      options.server || 'localhost:7233',
      options.namespace || 'default'
    );

    let isRunning = true;
    
    while (isRunning) {
      try {
        const status = await client.getWorkflowStatus(workflowId);
        
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] Status: ${status.status}`);
        
        if (status.status === 'RUNNING') {
          console.log(`   Started: ${status.startTime.toISOString()}`);
        } else {
          console.log(`   Started: ${status.startTime.toISOString()}`);
          console.log(`   Ended: ${status.endTime?.toISOString() || 'N/A'}`);
          
          if (status.result) {
            console.log(`   Result: Delay ${status.result.delayMinutes}min, Notification ${status.result.notificationSent ? 'sent' : 'skipped'}`);
          }
          
          if (status.error) {
            console.log(`   Error: ${status.error}`);
          }
          
          isRunning = false;
        }
        
        if (isRunning) {
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        }
        
      } catch (error) {
        console.error(`❌ Error monitoring workflow: ${error}`);
        isRunning = false;
      }
    }

  } catch (error) {
    console.error('❌ Failed to connect to Temporal server:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]) {
  const options: any = {};
  const commands: string[] = [];
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('--')) {
      const key = arg.substring(2);
      const value = args[i + 1];
      
      if (value && !value.startsWith('--')) {
        options[key] = value;
        i++; // Skip next argument as it's the value
      } else {
        options[key] = true;
      }
    } else {
      commands.push(arg);
    }
  }
  
  return { commands, options };
}

/**
 * Main CLI function
 */
async function main() {
  const args = process.argv.slice(2);
  const { commands, options } = parseArgs(args);
  
  if (commands.length === 0 || commands[0] === 'help') {
    displayHelp();
    return;
  }

  const command = commands[0];

  try {
    switch (command) {
      case 'list-routes':
        listRoutes();
        break;
        
      case 'execute':
        if (commands.length < 2) {
          console.error('❌ Route ID required for execute command');
          console.log('Usage: npm run client execute <route-id>');
          return;
        }
        await executeRoute(commands[1], options);
        break;
        
      case 'execute-all':
        await executeAllRoutes(options);
        break;
        
      case 'monitor':
        if (commands.length < 2) {
          console.error('❌ Workflow ID required for monitor command');
          console.log('Usage: npm run client monitor <workflow-id>');
          return;
        }
        await monitorWorkflow(commands[1], options);
        break;
        
      default:
        console.error(`❌ Unknown command: ${command}`);
        displayHelp();
    }
  } catch (error) {
    console.error('❌ Command failed:', error);
    process.exit(1);
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ CLI failed:', error);
    process.exit(1);
  });
}

export { main as runCLI };