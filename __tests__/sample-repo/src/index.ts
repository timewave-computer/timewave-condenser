import { App } from './components/App';
import { Config } from './utils/config';

/**
 * Main entry point for the application
 */
async function main() {
  // Load configuration
  const config = new Config();
  await config.load();
  
  // Initialize and start the application
  const app = new App(config);
  await app.initialize();
  await app.start();
  
  console.log(`Application started on port ${config.port}`);
}

// Run the application
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 