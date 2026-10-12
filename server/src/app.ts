import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { authRoutes } from "./routes/auth.js";
import { meRoutes } from "./routes/me.js";
import { handlesRoutes } from "./routes/handles.js";
import { gemsRoutes } from "./routes/gems.js";
import { stashRoutes } from "./routes/stash.js";
import { activityRoutes } from "./routes/activity.js";
import { usersRoutes } from "./routes/users.js";
import { reportsRoutes } from "./routes/reports.js";

export async function buildApp() {
  const app = Fastify({
    logger: true,
    trustProxy: true,
  });

  await app.register(cors, {
    origin: true,
  });

  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: "1 minute",
  });

  app.get("/health", async () => ({ ok: true }));

  await app.register(authRoutes);
  await app.register(meRoutes);
  await app.register(handlesRoutes);
  await app.register(gemsRoutes);
  await app.register(stashRoutes);
  await app.register(activityRoutes);
  await app.register(usersRoutes);
  await app.register(reportsRoutes);

  return app;
}
