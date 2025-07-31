#!/usr/bin/env node

/**
 * SMTP MCP Server Startup Script
 * This script helps users get started with the SMTP MCP Server
 */

import { execSync } from 'child_process';
import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';

const packageJsonPath = join(process.cwd(), 'package.json');
const envExamplePath = join(process.cwd(), '.env.example');
const envPath = join(process.cwd(), '.env');
const buildPath = join(process.cwd(), 'build');

console.log('🚀 SMTP MCP Server Setup');
console.log('========================\n');

// Check if package.json exists
if (!existsSync(packageJsonPath)) {
  console.error('❌ package.json not found. Please run this script from the project root.');
  process.exit(1);
}

// Install dependencies if node_modules doesn't exist
if (!existsSync(join(process.cwd(), 'node_modules'))) {
  console.log('📦 Installing dependencies...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed successfully\n');
  } catch (error) {
    console.error('❌ Failed to install dependencies');
    process.exit(1);
  }
}

// Create .env file if it doesn't exist
if (!existsSync(envPath) && existsSync(envExamplePath)) {
  console.log('🔧 Creating .env file from .env.example...');
  try {
    execSync(`cp "${envExamplePath}" "${envPath}"`, { stdio: 'inherit' });
    console.log('✅ .env file created. Please edit it with your SMTP configuration\n');
  } catch (error) {
    console.log('⚠️  Please manually copy .env.example to .env\n');
  }
}

// Build the project
console.log('🔨 Building the project...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Project built successfully\n');
} catch (error) {
  console.error('❌ Failed to build project');
  process.exit(1);
}

console.log('🎉 Setup complete! You can now:');
console.log('   • Start the server: npm start');
console.log('   • Development mode: npm run dev');
console.log('   • View logs: Check the logs directory');
console.log('\n📚 Need help? Check the README.md file for detailed instructions.');
