import { SearchResult } from '@/types/rag';

import {
  DefaultAzureCredential,
  getBearerTokenProvider,
} from '@azure/identity';
import { RedisClientType, createClient } from 'redis';

export class SearchResultsStore {
  private redisClient!: RedisClientType;
  private tokenProvider!: ReturnType<typeof getBearerTokenProvider>;
  private isInitialized: boolean = false;
  private isRedisAvailable: boolean = true;

  constructor() {
    this.initializeAsync();
  }

  private async initializeAsync(): Promise<void> {
    try {
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
    } catch (error) {
      this.isRedisAvailable = false;
      console.error('Redis connection initialization error:', error);
      // Don't throw - let the application continue without Redis
    }
  }

  private async reconnectWithFreshToken(): Promise<boolean> {
    try {
      // Disconnect if already connected
      if (this.redisClient?.isOpen) {
        await this.redisClient.disconnect();
      }

      // Get a fresh token
      const accessToken = await this.tokenProvider();

      // Reconnect with the fresh token
      this.redisClient = createClient({
        url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
        password: accessToken, // Use the token string directly
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
      });

      await this.redisClient.connect();
      return true;
    } catch (error) {
      console.error('Error refreshing Redis connection:', error);
      this.isRedisAvailable = false;
      return false;
    }
  }

  private async ensureConnection(): Promise<boolean> {
    if (!this.isInitialized) {
      try {
        await this.initializeAsync();
        return this.isRedisAvailable;
      } catch (error) {
        console.error('Failed to initialize Redis connection:', error);
        return false;
      }
    }

    if (!this.redisClient?.isOpen) {
      try {
        return await this.reconnectWithFreshToken();
      } catch (error) {
        console.error('Failed to reconnect to Redis:', error);
        return false;
      }
    }

    return this.isRedisAvailable;
  }

  async getPreviousSearchDocs(key: string): Promise<SearchResult[]> {
    try {
      const isConnected = await this.ensureConnection();
      if (!isConnected) {
        console.warn('Redis unavailable, returning empty search results.');
        return [];
      }

      const data = await this.redisClient.get(`search:${key}`);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Redis get error:', error);
      return [];
    }
  }

  async savePreviousSearchDocs(
    key: string,
    docs: SearchResult[],
  ): Promise<void> {
    try {
      const isConnected = await this.ensureConnection();
      if (!isConnected) {
        console.warn('Redis unavailable, skipping save operation.');
        return;
      }

      await this.redisClient.set(
        `search:${key}`,
        JSON.stringify(docs),
        { EX: 3600 }, // Expire after 1 hour
      );
    } catch (error) {
      console.error('Redis set error:', error);
      // Don't throw - let the application continue without Redis
    }
  }
}
