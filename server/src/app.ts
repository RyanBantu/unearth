import Fastify from "fastify";
import cookie from "@fastify/cookie";
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
import { publicRoutes } from "./routes/public.js";
import { corsOrigins } from "./lib/flags.js";

export async function buildApp() {
  const app = Fastify({
    logger: true,
    trustProxy: true,
  });

  // iOS builds send Content-Type: application/json on bodyless requests (e.g. DELETE).
  const defaultJsonParser = app.getDefaultJsonParser("error", "error");
  app.removeContentTypeParser("application/json");
  app.addContentTypeParser("application/json", { parseAs: "string" }, (request, body, done) => {
    if (body === "") return done(null, undefined);
    defaultJsonParser(request, body as string, done);
  });

  // Native apps send no Origin header, so this only affects browsers.
  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      const allowed = corsOrigins();
      const ok = allowed.some((o) =>
        typeof o === "string" ? o === origin.replace(/\/$/, "") : o.test(origin),
      );
      cb(null, ok);
    },
    credentials: true,
  });

  await app.register(cookie);

  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: "1 minute",
  });

  app.get("/health", async () => ({ ok: true }));

  await app.register(legalRoutes);
  await app.register(publicRoutes);
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
