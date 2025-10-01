#!/usr/bin/env node

import { configLoader, printConfigHelp } from '../utilities/config-loader';
import { getCompleteConfigurationHelp } from '../config';

/**
 * Simple CLI tool for configuration management
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'help':
    case '--help':
    case '-h':
      printConfigHelp();
      break;

    case 'validate':
      console.log('🔍 Validating configuration...\n');
      try {
        const result = await configLoader.validateConfig();
        if (result.isValid) {
          console.log('\n✅ Configuration is valid and ready to use!');
          process.exit(0);
        } else {
          console.log('\n❌ Configuration validation failed');
          process.exit(1);
        }
      } catch (error) {
        console.error('\n❌ Configuration validation error:', error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
      }
      break;

    case 'load':
      console.log('📋 Loading configuration...\n');
      try {
        await configLoader.initialize({ verbose: true });
        console.log('\n✅ Configuration loaded successfully!');
        
        const summary = configLoader.getConfigSummary();
        if (summary) {
          console.log('\n📊 Configuration Summary:');
          Object.entries(summary).forEach(([key, value]) => {
            console.log(`  ${key}: ${value}`);
          });
        }
        process.exit(0);
      } catch (error) {
        console.error('\n❌ Failed to load configuration:', error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
      }
      break;

    case 'check':
      console.log('🔍 Checking configuration status...\n');
      try {
        if (configLoader.isReady()) {
          console.log('✅ Configuration is loaded and valid');
          const summary = configLoader.getConfigSummary();
          if (summary) {
            console.log('\n📊 Current Configuration:');
            Object.entries(summary).forEach(([key, value]) => {
              console.log(`  ${key}: ${value}`);
            });
          }
        } else {
          console.log('❌ Configuration is not loaded or invalid');
          console.log('Run "npm run config:load" to load configuration');
        }
        process.exit(0);
      } catch (error) {
        console.error('❌ Error checking configuration:', error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
      }
      break;

    case 'example':
      console.log('📝 Example .env configuration:\n');
      console.log(getCompleteConfigurationHelp());
      break;

    default:
      console.log('Freight Delay Monitor - Configuration CLI\n');
      console.log('Usage: npm run config:<command>\n');
      console.log('Available commands:');
      console.log('  help      - Show configuration help');
      console.log('  validate  - Validate current configuration');
      console.log('  load      - Load and display configuration');
      console.log('  check     - Check configuration status');
      console.log('  example   - Show example configuration');
      console.log('\nExamples:');
      console.log('  npm run config:validate');
      console.log('  npm run config:load');
      console.log('  npm run config:help');
      break;
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('CLI Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  });
}

export { main as configCli };