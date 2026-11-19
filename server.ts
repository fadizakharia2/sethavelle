import { createRequestHandler, RouterContextProvider } from "react-router";
import * as serverBuild from "virtual:react-router/server-build";

import { envContext } from "~/lib/env";
import { ConfigError, getConfig } from "~/lib/server/config.server";
import {
  applyPrivateCaching,
  applySecurityHeaders,
  isPrivatePath,
  logServerError,
} from "~/lib/server/security.server";

const handleRequest = createRequestHandler(serverBuild, process.env.NODE_ENV);

/**
 * Oxygen / Mini Oxygen fetch handler.
 */
export default {
  async fetch(rawRequest: Request, env: Env, executionContext: ExecutionContext): Promise<Response> {
    const request = toPublicRequest(rawRequest);
    const url = new URL(request.url);
    let response: Response;

    try {
      // Fail closed on a misconfigured worker before touching any route.
      getConfig(env);

      const method = request.method;
      if ((method === "GET" || method === "HEAD") && request.body) {
        return finalize(new Response("Bad request", { status: 400 }), url);
      }
      if (url.pathname.includes("//")) {
        return finalize(
          new Response(null, {
            status: 301,
            headers: { location: url.pathname.replace(/[/]+/g, "/") + url.search },
          }),
          url,
        );
      }

      const routerContext = new RouterContextProvider();
      routerContext.cache = await caches.open("hydrogen-v1");
      routerContext.set(envContext, env);
      routerContext.env = env;
      routerContext.waitUntil = executionContext.waitUntil.bind(executionContext);

      response = await handleRequest(request, routerContext as never);
    } catch (error) {
      if (error instanceof ConfigError) {
        // Variable names only — values are never part of the message.
        console.error(error.message);
        response = plainError(503, "The house is temporarily closed. Please return shortly.");
      } else {
        logServerError("worker", error);
        response = plainError(500, "An unexpected error occurred.");
      }
    }

    return finalize(response, url);
  },
};

function finalize(response: Response, url: URL): Response {
  // Responses from fetch() can have immutable headers; copy when needed.
  let out = response;
  try {
    applySecurityHeaders(out.headers);
  } catch {
    out = new Response(response.body, response);
    applySecurityHeaders(out.headers);
  }
  if (isPrivatePath(url.pathname)) applyPrivateCaching(out.headers);
  return out;
}

function plainError(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

// Behind a proxy that terminates TLS, such as a tunnel, the worker sees `http:`
// with `x-forwarded-proto: https`. Customer Account OAuth needs the public
// `https:` origin. Oxygen itself always serves HTTPS.
function toPublicRequest(request: Request): Request {
  const url = new URL(request.url);
  if (url.protocol !== "http:" || request.headers.get("x-forwarded-proto") !== "https") {
    return request;
  }
  url.protocol = "https:";
  return new Request(url, request);
}
