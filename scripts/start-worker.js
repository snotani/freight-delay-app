#!/usr/bin/env node

/**
 * Startup script for the Freight Delay Monitor Worker
 * 
 * This script provides a simple way to start the worker with proper
 * environment validation and error handling.
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Freight Delay Monitor Worker...');
console.log('📁 Working directory:', process.cwd());

// Build the project first
console.log('🔨 Building project...');
const buildProcess = spawn('npm', ['run', 'build'], { 
  stdio: 'inherit',
  cwd: process.cwd()
});

buildProcess.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ Build failed with exit code:', code);
    process.exit(1);
  }
  
  console.log('✅ Build completed successfully');
  console.log('▶️  Starting worker...');
  
  // Start the worker
  const workerProcess = spawn('node', ['dist/worker.js'], {
    stdio: 'inherit',
    cwd: process.cwd()
  });
  
  // Handle worker process events
  workerProcess.on('close', (code) => {
    console.log(`👋 Worker process exited with code: ${code}`);
    process.exit(code);
  });
  
  workerProcess.on('error', (error) => {
    console.error('❌ Worker process error:', error);
    process.exit(1);
  });
  
  // Handle shutdown signals
  process.on('SIGINT', () => {
    console.log('\n📡 Received SIGINT, shutting down worker...');
    workerProcess.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    console.log('📡 Received SIGTERM, shutting down worker...');
    workerProcess.kill('SIGTERM');
  });
});

buildProcess.on('error', (error) => {
  console.error('❌ Build process error:', error);
  process.exit(1);
});