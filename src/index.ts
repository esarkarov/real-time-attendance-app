import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { typeDefs } from './graphql/typeDefs';
import { resolvers } from './graphql/resolvers';
import { connectDB } from './utils/db';

async function main() {
  await connectDB();

  const app = express();
  const httpServer = http.createServer(app);

  // Build executable schema (shared between HTTP and WS)
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  // WebSocket server for subscriptions
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  const serverCleanup = useServer({ schema }, wsServer);

  // Apollo Server (HTTP)
  const server = new ApolloServer({
    schema,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });

  await server.start();

  app.use(
    '/graphql',
    cors<cors.CorsRequest>({ origin: '*' }),
    express.json(),
    expressMiddleware(server)
  );

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const PORT = process.env.PORT ?? 4000;

  httpServer.listen(PORT, () => {
    console.log(`🚀 GraphQL API ready at   http://localhost:${PORT}/graphql`);
    console.log(`🔌 Subscriptions ready at ws://localhost:${PORT}/graphql`);
    console.log(`💚 Health check at        http://localhost:${PORT}/health`);
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
