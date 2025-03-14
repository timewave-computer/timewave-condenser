import fs from 'fs';
import path from 'path';

/**
 * Application configuration class
 */
export class Config {
  /** HTTP server port */
  public port: number = 3000;
  
  /** Database connection URL */
  public dbUrl: string = 'mongodb://localhost:27017/myapp';
  
  /** JWT secret for authentication */
  public jwtSecret: string = 'default-secret';
  
  /** Environment (development, production, test) */
  public environment: string = 'development';

  /**
   * Load configuration from file
   */
  async load(): Promise<Config> {
    try {
      // Look for config file in current directory
      const configPath = path.join(process.cwd(), 'config.json');
      
      if (fs.existsSync(configPath)) {
        const content = await fs.promises.readFile(configPath, 'utf8');
        const config = JSON.parse(content);
        
        // Override default values with values from config file
        this.port = config.port || this.port;
        this.dbUrl = config.dbUrl || this.dbUrl;
        this.jwtSecret = config.jwtSecret || this.jwtSecret;
        this.environment = config.environment || this.environment;
      }
    } catch (error) {
      console.warn('Failed to load config:', error);
    }
    
    // Also check for environment variables
    if (process.env.PORT) {
      this.port = parseInt(process.env.PORT, 10);
    }
    
    if (process.env.DB_URL) {
      this.dbUrl = process.env.DB_URL;
    }
    
    if (process.env.JWT_SECRET) {
      this.jwtSecret = process.env.JWT_SECRET;
    }
    
    if (process.env.NODE_ENV) {
      this.environment = process.env.NODE_ENV;
    }
    
    return this;
  }
} 