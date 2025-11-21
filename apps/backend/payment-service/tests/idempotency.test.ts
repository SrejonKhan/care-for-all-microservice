import { describe, test, expect, beforeEach } from 'bun:test';
import { IdempotencyService } from '../src/services/idempotency.service';

describe('IdempotencyService', () => {
  beforeEach(() => {
    IdempotencyService.clear();
  });

  test('should generate unique idempotency keys', () => {
    const key1 = IdempotencyService.generateKey();
    const key2 = IdempotencyService.generateKey();

    expect(key1).toBeDefined();
    expect(key2).toBeDefined();
    expect(key1).not.toBe(key2);
  });

  test('should store and retrieve idempotency response', async () => {
    const key = 'test_idempotency_key';
    const response = { success: true, data: { id: '123' } };

    await IdempotencyService.storeResponse(key, response);

    const result = await IdempotencyService.checkKey(key);

    expect(result.exists).toBe(true);
    expect(result.response).toEqual(response);
  });

  test('should return not exists for non-existent key', async () => {
    const result = await IdempotencyService.checkKey('non_existent_key');

    expect(result.exists).toBe(false);
    expect(result.response).toBeUndefined();
  });

  test('should get correct stats', async () => {
    await IdempotencyService.storeResponse('key1', { data: 'test1' });
    await IdempotencyService.storeResponse('key2', { data: 'test2' });

    const stats = IdempotencyService.getStats();

    expect(stats.total).toBe(2);
    expect(stats.expired).toBe(0);
  });

  test('should clear all keys', async () => {
    await IdempotencyService.storeResponse('key1', { data: 'test1' });
    await IdempotencyService.storeResponse('key2', { data: 'test2' });

    IdempotencyService.clear();

    const stats = IdempotencyService.getStats();
    expect(stats.total).toBe(0);
  });
});

