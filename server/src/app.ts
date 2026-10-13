import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { authRoutes } from "./routes/auth.js";
import { meRoutes } from "./routes/me.js";
import { handlesRoutes } from "./routes/handles.js";
import { gemsRoutes } from "./routes/gems.js";
import { findsRoutes } from "./routes/finds.js";
import { stashRoutes } from "./routes/stash.js";
import { activityRoutes } from "./routes/activity.js";
import { usersRoutes } from "./routes/users.js";
import { blocksRoutes } from "./routes/blocks.js";
import { reportsRoutes } from "./routes/reports.js";
import { adminRoutes } from "./routes/admin.js";
import { legalRoutes } from "./routes/legal.js";

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

  await app.register(legalRoutes);
  await app.register(authRoutes);
  await app.register(meRoutes);
  await app.register(handlesRoutes);
  await app.register(gemsRoutes);
  await app.register(findsRoutes);
  await app.register(stashRoutes);
  await app.register(activityRoutes);
  await app.register(usersRoutes);
  await app.register(blocksRoutes);
  await app.register(reportsRoutes);
  await app.register(adminRoutes);

  return app;
}
