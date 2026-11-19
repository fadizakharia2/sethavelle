import { data } from "react-router";

import { contactSchema } from "~/lib/forms";
import { appConfigContext } from "~/lib/server/app-context";
import { createDedupe, handleFormPost } from "~/lib/server/forms.server";
import { createRateLimiter } from "~/lib/server/security.server";

import type { Route } from "./+types/api.contact";

const limiter = createRateLimiter({ limit: 4, windowMs: 15 * 60 * 1000 });
const dedupe = createDedupe();

export async function action({ request, context }: Route.ActionArgs) {
  const config = context.get(appConfigContext);
  const result = await handleFormPost({
    request,
    schema: contactSchema,
    limiter,
    dedupe,
    webhook: config.contactWebhook,
    kind: "contact",
    successMessage: "Your message has been received. The house will reply in due course.",
  });
  return data(result.body, { status: result.status, headers: result.headers });
}

export function loader() {
  throw data(null, { status: 405, headers: { Allow: "POST" } });
}
