import { data } from "react-router";

import { newsletterSchema } from "~/lib/forms";
import { appConfigContext } from "~/lib/server/app-context";
import { createDedupe, handleFormPost } from "~/lib/server/forms.server";
import { createRateLimiter } from "~/lib/server/security.server";

import type { Route } from "./+types/api.newsletter";

const limiter = createRateLimiter({ limit: 5, windowMs: 10 * 60 * 1000 });
const dedupe = createDedupe();

export async function action({ request, context }: Route.ActionArgs) {
  const config = context.get(appConfigContext);
  const result = await handleFormPost({
    request,
    schema: newsletterSchema,
    limiter,
    dedupe,
    webhook: config.newsletterWebhook,
    kind: "newsletter",
    successMessage: "Your name is written in the ledger. Our first letter will find you.",
  });
  return data(result.body, { status: result.status, headers: result.headers });
}

export function loader() {
  throw data(null, { status: 405, headers: { Allow: "POST" } });
}
