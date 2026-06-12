import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildServer, prisma } from './server';

describe('Mindmap API Edge Cases', () => {
  const server = buildServer();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /mindmaps', () => {
    it('should reject missing topic', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/mindmaps',
        payload: {
          nodes: [{ id: '1', data: { label: 'A' } }],
          edges: []
        }
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.payload).message).toBe('Payload validation failed');
    });

    it('should reject empty nodes array', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/mindmaps',
        payload: {
          topic: 'Test Topic',
          nodes: [],
          edges: []
        }
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.payload).message).toBe('Payload validation failed');
    });

    it('should pass with valid data', async () => {
      // Mock the DB response using spyOn
      vi.spyOn(prisma.mindmap, 'create').mockResolvedValueOnce({
        id: '123e4567-e89b-12d3-a456-426614174000',
        topic: 'Test Topic',
        nodes: [{ id: '1' }],
        edges: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const response = await server.inject({
        method: 'POST',
        url: '/mindmaps',
        payload: {
          topic: 'Test Topic',
          nodes: [{ id: '1', data: { label: 'A' } }],
          edges: []
        }
      });

      expect(response.statusCode).toBe(201);
      expect(JSON.parse(response.payload).topic).toBe('Test Topic');
    });
  });

  describe('GET /mindmaps/:id', () => {
    it('should reject malformed UUIDs', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/mindmaps/not-a-uuid'
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.payload).message).toBe('Payload validation failed');
    });

    it('should return 404 for non-existent UUID', async () => {
      // Mock the DB returning null
      vi.spyOn(prisma.mindmap, 'findUnique').mockResolvedValueOnce(null);

      const response = await server.inject({
        method: 'GET',
        url: '/mindmaps/123e4567-e89b-12d3-a456-426614174000'
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.payload).message).toBe('Mindmap not found');
    });
  });
});
