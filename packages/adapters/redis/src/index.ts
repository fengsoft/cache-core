import type { CacheStore, CacheTagStore } from "@fengsoft/cache-core-domain";
import type Redis from "ioredis";

function tagKey(tag: string) {
	return `cache-core:tag:${tag}`;
}

export class RedisCacheStore implements CacheStore {
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

export class RedisTagStore implements CacheTagStore {
	constructor(private readonly redis: Redis) {}

	async add(tag: string, key: string) {
		await this.redis.sadd(tagKey(tag), key);
	}

	async list(tag: string) {
		return this.redis.smembers(tagKey(tag));
	}

	async clear(tag: string) {
		await this.redis.del(tagKey(tag));
	}

	async removeKey(key: string) {
		const keys = await this.redis.keys(tagKey("*"));

		if (keys.length === 0) {
			return;
		}

		const pipeline = this.redis.pipeline();

		for (const tagSet of keys) {
			pipeline.srem(tagSet, key);
		}

		await pipeline.exec();
	}
}
