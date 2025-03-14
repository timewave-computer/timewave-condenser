import { Config } from '../utils/config';
import { UserService } from '../api/userService';

/**
 * Main application class
 */
export class App {
  private config: Config;
  private userService: UserService;
  private isRunning: boolean = false;

  /**
   * Creates a new App instance
   * @param config Application configuration
   */
  constructor(config: Config) {
    this.config = config;
    this.userService = new UserService(config);
  }

  /**
   * Initialize the application
   */
  async initialize(): Promise<void> {
    console.log('Initializing application...');
    await this.userService.connect();
    return Promise.resolve();
  }

  /**
   * Start the application
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return Promise.resolve();
    }

    console.log('Starting application...');
    this.isRunning = true;
    return Promise.resolve();
  }

  /**
   * Stop the application
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return Promise.resolve();
    }

    console.log('Stopping application...');
    await this.userService.disconnect();
    this.isRunning = false;
    return Promise.resolve();
  }
} 