import { Config } from '../utils/config';

/**
 * User data interface
 */
interface User {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
}

/**
 * Service for managing users
 */
export class UserService {
  private config: Config;
  private isConnected: boolean = false;
  private users: User[] = [];

  /**
   * Creates a new UserService
   * @param config Application configuration
   */
  constructor(config: Config) {
    this.config = config;
    
    // Add some sample users
    this.users = [
      {
        id: '1',
        username: 'admin',
        email: 'admin@example.com',
        createdAt: new Date()
      },
      {
        id: '2',
        username: 'user',
        email: 'user@example.com',
        createdAt: new Date()
      }
    ];
  }

  /**
   * Connect to the database
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return Promise.resolve();
    }

    console.log(`Connecting to database at ${this.config.dbUrl}...`);
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 100));
    this.isConnected = true;
    console.log('Connected to database');
    return Promise.resolve();
  }

  /**
   * Disconnect from the database
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return Promise.resolve();
    }

    console.log('Disconnecting from database...');
    // Simulate disconnection delay
    await new Promise(resolve => setTimeout(resolve, 100));
    this.isConnected = false;
    console.log('Disconnected from database');
    return Promise.resolve();
  }

  /**
   * Get all users
   */
  async getUsers(): Promise<User[]> {
    if (!this.isConnected) {
      throw new Error('Not connected to database');
    }
    
    return [...this.users];
  }

  /**
   * Get a user by ID
   * @param id User ID
   */
  async getUserById(id: string): Promise<User | null> {
    if (!this.isConnected) {
      throw new Error('Not connected to database');
    }
    
    return this.users.find(user => user.id === id) || null;
  }

  /**
   * Create a new user
   * @param userData User data
   */
  async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    if (!this.isConnected) {
      throw new Error('Not connected to database');
    }
    
    const newUser: User = {
      id: (this.users.length + 1).toString(),
      ...userData,
      createdAt: new Date()
    };
    
    this.users.push(newUser);
    return newUser;
  }
} 