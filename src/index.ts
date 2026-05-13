import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { makeExecutableSchema } from "@graphql-tools/schema";
import cors from "cors";
import "dotenv/config";
import express from "express";
import { express as voyagerMiddleware } from "graphql-voyager/middleware";
import { useServer } from "graphql-ws/lib/use/ws";
import http from "http";
import { WebSocketServer } from "ws";
import { resolvers } from "./graphql/resolvers";
import { typeDefs } from "./graphql/typeDefs";
import { getAuthContext, verifyToken } from "./utils/auth";
import { connectDB } from "./utils/db";
import { exportSessionAttendance, exportStudentStats } from "./utils/export";

async function main() {
  await connectDB();

  const app = express();
  const httpServer = http.createServer(app);

  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/graphql",
  });
  const serverCleanup = useServer({ schema }, wsServer);

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
    "/graphql",
    cors<cors.CorsRequest>({ origin: "*" }),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => getAuthContext(req.headers.authorization),
    }),
  );

  app.use("/voyager", voyagerMiddleware({ endpointUrl: "/graphql" }) as any);

  // ── Export routes (TEACHER only) ───────────────────────────────────────────
  app.use("/export", cors<cors.CorsRequest>({ origin: "*" }));

  function requireTeacherToken(
    req: express.Request,
    res: express.Response,
  ): boolean {
    try {
      const auth = req.headers.authorization;
      if (!auth?.startsWith("Bearer ")) {
        res.status(401).json({ error: "Unauthorized." });
        return false;
      }
      const payload = verifyToken(auth.slice(7));
      if (payload.role !== "TEACHER") {
        res.status(403).json({ error: "Teacher access required." });
        return false;
      }
      return true;
    } catch {
      res.status(401).json({ error: "Invalid token." });
      return false;
    }
  }

  app.get("/export/session/:sessionId", async (req, res) => {
    if (!requireTeacherToken(req, res)) return;
    try {
      await exportSessionAttendance(req.params.sessionId, res);
    } catch (err) {
      res
        .status(500)
        .json({ error: err instanceof Error ? err.message : "Export failed." });
    }
  });

  app.get("/export/stats", async (req, res) => {
    if (!requireTeacherToken(req, res)) return;
    try {
      await exportStudentStats(res);
    } catch (err) {
      res
        .status(500)
        .json({ error: err instanceof Error ? err.message : "Export failed." });
    }
  });

  // ── Health check ───────────────────────────────────────────────────────────

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const PORT = process.env.PORT ?? 4000;

  httpServer.listen(PORT, () => {
    console.log(`GraphQL API ready at   http://localhost:${PORT}/graphql`);
    console.log(`Health check at        http://localhost:${PORT}/health`);
    console.log(`GraphQL Voyager at     http://localhost:${PORT}/voyager`);
    console.log(
      `Export session at      http://localhost:${PORT}/export/session/:sessionId`,
    );
    console.log(`Export stats at        http://localhost:${PORT}/export/stats`);
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
