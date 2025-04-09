import {
  DefaultAzureCredential,
  getBearerTokenProvider,
} from '@azure/identity';
import { RedisClientType, createClient } from 'redis';

export class RedisService {
  private static instance: RedisService;
  private redisClient!: RedisClientType;
  private tokenProvider!: ReturnType<typeof getBearerTokenProvider>;
  private isInitialized: boolean = false;
  private isRedisAvailable: boolean = true;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {
    this.initializationPromise = this.initializeAsync();
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  private async initializeAsync(): Promise<void> {
    try {
      console.log('Initializing Redis connection...');

      // Create an Azure AD token provider
      this.tokenProvider = getBearerTokenProvider(
        new DefaultAzureCredential(),
        'https://redis.azure.com/.default',
      );

      const accessToken = await this.tokenProvider();
      let objectId = null;

      // Decode JWT token to extract the Object ID
      const tokenParts = accessToken.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(
          Buffer.from(tokenParts[1], 'base64').toString(),
        );
        objectId = payload.oid;
        console.log('Redis username (Object ID):', objectId);
      }

      // Connect to Redis using the token as the password
      this.redisClient = createClient({
        url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
        username: objectId,
        password: accessToken,
        socket: {
          tls: true, // Always use TLS with Entra authentication
          connectTimeout: 5000, // 5 seconds connection timeout
          reconnectStrategy: (retries) => {
            // Exponential backoff with max retry limit
            if (retries > 5) {
              this.isRedisAvailable = false;
              return new Error('Redis connection retry limit exceeded');
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      // Set up token refresh handling
      this.redisClient.on('error', async (err) => {
        this.isRedisAvailable = false;
        console.error('Redis connection error:', err);

        if (err.message.includes('WRONGPASS') || err.message.includes('AUTH')) {
          console.log(
            'Authentication error, will try to refresh token on next operation',
          );
        }
      });

      this.redisClient.on('connect', () => {
        this.isRedisAvailable = true;
        console.log('Successfully connected to Redis');
      });

      this.redisClient.on('reconnecting', () => {
        console.log('Attempting to reconnect to Redis...');
      });

      await this.redisClient.connect();
      this.isInitialized = true;
      this.isRedisAvailable = true;
      console.log('Redis connection successfully initialized');
    } catch (error) {
      this.isRedisAvailable = false;
      console.error('Redis connection initialization error:', error);
    }
  }

  private async reconnectWithFreshToken(): Promise<boolean> {
    try {
      console.log('Attempting to reconnect with fresh token');
      // Disconnect if already connected
      if (this.redisClient?.isOpen) {
        await this.redisClient.disconnect();
      }

      // Get a fresh token
      const accessToken = await this.tokenProvider();
      let objectId = null;

      // Decode JWT token to extract the Object ID
      const tokenParts = accessToken.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(
          Buffer.from(tokenParts[1], 'base64').toString(),
        );
        objectId = payload.oid;
      }

      // Reconnect with the fresh token
      this.redisClient = createClient({
        url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
        username: objectId,
        password: accessToken,
        socket: {
          tls: true,
          connectTimeout: 5000,
        },
      });

      // Re-register event handlers
      this.redisClient.on('error', (err) => {
        this.isRedisAvailable = false;
        console.error('Redis reconnection error:', err);
      });

      this.redisClient.on('connect', () => {
        this.isRedisAvailable = true;
        console.log('Successfully reconnected to Redis with fresh token');
      });

      await this.redisClient.connect();
      return true;
    } catch (error) {
      console.error('Error refreshing Redis connection:', error);
      this.isRedisAvailable = false;
      return false;
    }
  }

  public async getClient(): Promise<RedisClientType | null> {
    // Wait for initialization if it's in progress
    if (this.initializationPromise) {
      await this.initializationPromise;
      this.initializationPromise = null;
    }

    if (!this.isInitialized) {
      await this.initializeAsync();
    }

    if (!this.isRedisAvailable || !this.redisClient?.isOpen) {
      await this.reconnectWithFreshToken();
    }

    return this.isRedisAvailable ? this.redisClient : null;
  }

  // Helper methods for common Redis operations
  public async get(key: string): Promise<string | null> {
    try {
      const client = await this.getClient();
      if (!client) return null;

      return await client.get(key);
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  public async set(
    key: string,
    value: string,
    options?: { EX?: number },
  ): Promise<boolean> {
    try {
      const client = await this.getClient();
      if (!client) return false;

      await client.set(key, value, options);
      return true;
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  public async del(key: string): Promise<boolean> {
    try {
      const client = await this.getClient();
      if (!client) return false;

      await client.del(key);
      return true;
    } catch (error) {
      console.error(`Redis DEL error for key ${key}:`, error);
      return false;
    }
  }
}

// Export a singleton getter
export function getRedisService() {
  return RedisService.getInstance();
}
