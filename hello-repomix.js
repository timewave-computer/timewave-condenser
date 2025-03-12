#!/usr/bin/env node

/**
 * Hello World example for Repomix
 * This script demonstrates how to use Repomix to pack a repository
 */

// Import Repomix CLI functionality
import { runCli } from 'repomix';

async function main() {
  try {
    console.log('Starting Repomix hello world example...');
    
    // Run the CLI with default options (will use repomix.config.json if available)
    await runCli(['pack']);
    
    console.log('Repository packed successfully! Check output.md');
  } catch (error) {
    console.error('Error packing repository:', error);
  }
}

main(); 