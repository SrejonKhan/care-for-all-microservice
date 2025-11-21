import { describe, test, expect } from 'bun:test';

describe('Donation Service API', () => {
  const baseUrl = 'http://localhost:3003';

  describe('Health Check', () => {
    test('should return healthy status', async () => {
      const response = await fetch(`${baseUrl}/health`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBeDefined();
      expect(data.service).toBe('donation-service');
    });
  });

  describe('Root Endpoint', () => {
    test('should return service information', async () => {
      const response = await fetch(`${baseUrl}/`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.service).toBe('donation-service');
      expect(data.version).toBeDefined();
      expect(data.docs).toBe('/docs');
    });
  });

  describe('Documentation', () => {
    test('should serve OpenAPI spec', async () => {
      const response = await fetch(`${baseUrl}/openapi`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.openapi).toBe('3.1.0');
      expect(data.info.title).toContain('Donation Service');
    });
  });

  // Note: These tests require the service to be running
  // and MongoDB to be available. They serve as integration tests.
});

