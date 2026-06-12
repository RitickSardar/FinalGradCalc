import Fastify from 'fastify';
import cors from '@fastify/cors';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';

dotenv.config();

// Create Prisma Client instance (exporting for testing purposes)
export const setupPrisma = () => {
  const connectionString = process.env.DATABASE_URL || 'postgresql://fake:fake@localhost:5432/fake';
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

export const prisma = setupPrisma();

export function buildServer() {
  const server = Fastify({
    logger: true,
  }).withTypeProvider<TypeBoxTypeProvider>();

  server.register(cors, {
    origin: '*',
  });

  // Global Error Handler
  server.setErrorHandler(function (error, request, reply) {
    if (error.validation) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Payload validation failed',
        details: error.validation,
      });
    }
    
    server.log.error(error);
    return reply.status(500).send({ 
      error: 'Internal Server Error',
      message: 'Something went wrong on the server',
    });
  });

  // Schemas for validation
  const MindmapSchema = Type.Object({
    topic: Type.String({ minLength: 1, maxLength: 255 }),
    nodes: Type.Array(Type.Any(), { minItems: 1 }),
    edges: Type.Array(Type.Any()),
  });

  const IdParamSchema = Type.Object({
    id: Type.String({ format: 'uuid' })
  });

  // Routes
  server.post(
    '/mindmaps',
    {
      schema: {
        body: MindmapSchema,
      },
    },
    async (request, reply) => {
      try {
        const { topic, nodes, edges } = request.body;

        const mindmap = await prisma.mindmap.create({
          data: { topic, nodes, edges },
        });

        return reply.status(201).send(mindmap);
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Database Error', message: 'Failed to save mindmap' });
      }
    }
  );

  server.get(
    '/mindmaps/:id',
    {
      schema: {
        params: IdParamSchema,
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        
        const mindmap = await prisma.mindmap.findUnique({
          where: { id },
        });

        if (!mindmap) {
          return reply.status(404).send({ error: 'Not Found', message: 'Mindmap not found' });
        }

        return reply.send(mindmap);
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Database Error', message: 'Failed to retrieve mindmap' });
      }
    }
  );

  server.get('/mindmaps', async (request, reply) => {
    try {
      const mindmaps = await prisma.mindmap.findMany({
        select: {
          id: true,
          topic: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return reply.send(mindmaps);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Database Error', message: 'Failed to retrieve mindmaps' });
    }
  });

  return server;
}

// Start the server if this file is run directly
if (require.main === module) {
  const start = async () => {
    const server = buildServer();
    try {
      await server.listen({ port: 3001, host: '0.0.0.0' });
      console.log(`Server listening on http://localhost:3001`);
    } catch (err) {
      server.log.error(err);
      process.exit(1);
    }
  };
  start();
}
