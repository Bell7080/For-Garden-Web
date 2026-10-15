import { defineConfig, loadEnv } from "vite";
import notices from "./api/notices";
import preregister from "./api/preregister";
import site from "./api/site";
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
            const handler =
              path === "/api/notices"
                ? notices
                : path === "/api/preregister"
                  ? preregister
                  : path === "/api/site"
                    ? site
                    : null;
            if (!handler) return next();
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
              if (Buffer.byteLength(raw) > 4096) {
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
