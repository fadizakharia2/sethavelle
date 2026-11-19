import { isbot } from "isbot";
import { renderToReadableStream } from "react-dom/server";
import { ServerRouter, type EntryContext, type RouterContextProvider } from "react-router";

import { NonceProvider } from "~/lib/csp";
import { envContext } from "~/lib/env";
import { getConfig } from "~/lib/server/config.server";
import { createDocumentCsp } from "~/lib/server/csp.server";
import { logServerError } from "~/lib/server/security.server";

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
  context: RouterContextProvider,
) {
  const csp = createDocumentCsp(getConfig(context.get(envContext)));

  const body = await renderToReadableStream(
    <NonceProvider value={csp.nonce}>
      <ServerRouter context={reactRouterContext} url={request.url} nonce={csp.nonce} />
    </NonceProvider>,
    {
      nonce: csp.nonce,
      signal: request.signal,
      onError(error) {
        logServerError("render", error);
        responseStatusCode = 500;
      },
    },
  );

  if (isbot(request.headers.get("user-agent"))) {
    await body.allReady;
  }

  responseHeaders.set("Content-Type", "text/html; charset=utf-8");
  csp.applyResponseHeaders(responseHeaders);

  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}

/** Logs loader/action errors without leaking tokens or query strings. */
export function handleError(error: unknown, { request }: { request: Request }) {
  if (request.signal.aborted) return;
  logServerError(`route ${new URL(request.url).pathname}`, error);
}
