import type Redis from "ioredis";

export class RedisCacheStore {
  constructor(private readonly redis: Redis) {}

  async get(key: string) {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttlSeconds: number) {
    await this.redis.set(key, value, "EX", ttlSeconds);
  }

  async del(key: string) {
    await this.redis.del(key);
  }
}
