import { defineConfig, loadEnv } from "vite";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import notices from "./api/notices";
import preregister from "./api/preregister";
import site from "./api/site";
import support from "./api/support";
import type { Response, Request } from "./server/http";
export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  return {
    plugins: [
      {
        name: "local-api",
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const path = req.url?.split("?")[0];
            if (
              path &&
              /^\/(legal(?:\/[A-Za-z0-9-]+)*|terms|privacy|probabilities)\/?$/.test(
                path,
              )
            ) {
              const target = path.replace(/\/$/, "") + "/index.html";
              if (existsSync(resolve("public", "." + target))) {
                req.url = target;
                return next();
              }
            }
            const handler =
              path === "/api/notices"
                ? notices
                : path === "/api/preregister"
                  ? preregister
                  : path === "/api/site"
                    ? site
                    : path === "/api/support"
                      ? support
                      : null;
            if (!handler) {
              if (path?.startsWith("/api/")) {
                res.statusCode = 404;
                res.end();
                return;
              }
              return next();
            }
            const response: Response = {
              status(code) {
                res.statusCode = code;
                return response;
              },
              json(value) {
                res.setHeader(
                  "Content-Type",
                  "application/json; charset=utf-8",
                );
                res.end(JSON.stringify(value));
              },
              setHeader(name, value) {
                res.setHeader(name, value);
              },
            };
            let raw = "";
            for await (const chunk of req) {
              raw += String(chunk);
              if (
                Buffer.byteLength(raw) >
                (path === "/api/support" ? 16384 : 4096)
              ) {
                response.status(413).json({ error: "body_too_large" });
                return;
              }
            }
            await handler(
              {
                method: req.method,
                headers: req.headers,
                body: raw || undefined,
                url: req.url,
              } as Request,
              response,
            );
          });
        },
      },
    ],
  };
});
