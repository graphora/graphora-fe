import type { Express } from "express";
import { createServer, type Server } from "http";
import { auth } from "express-oauth2-jwt-bearer";

export function registerRoutes(app: Express): Server {
  // Skip Auth0 middleware if environment variables are not set
  const audience = process.env.VITE_AUTH0_AUDIENCE;
  const domain = process.env.VITE_AUTH0_DOMAIN;
  
  const checkJwt = audience && domain ? auth({
    audience,
    issuerBaseURL: `https://${domain}/`,
  }) : (_req: any, _res: any, next: any) => next();

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Protected routes
  app.get("/api/user", checkJwt, (req, res) => {
    res.json({ user: req.auth?.payload });
  });

  const httpServer = createServer(app);
  return httpServer;
}
