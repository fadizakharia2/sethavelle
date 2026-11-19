import { useId } from "react";
import { useFetcher } from "react-router";

import { PageHeader } from "~/components/PageHeader";
import type { FormResult } from "~/lib/forms";
import { buildMeta, pageTitle } from "~/lib/seo";

import type { Route } from "./+types/contact";

export function meta({ matches }: Route.MetaArgs) {
  const root = matches[0]?.loaderData as { origin?: string } | undefined;
  return buildMeta({
    title: pageTitle("Contact"),
    description: "Write to the house of SETHAVELLE.",
    canonical: root?.origin ? `${root.origin}/contact` : undefined,
  });
}

const TOPICS = [
  { value: "order", label: "An order" },
  { value: "product", label: "A fragrance" },
  { value: "press", label: "Press & collaborations" },
  { value: "other", label: "Something else" },
];

export default function Contact({ matches }: Route.ComponentProps) {
  const root = matches[0]?.loaderData as { origin?: string } | undefined;
  const fetcher = useFetcher<FormResult>();
  const id = useId();
  const busy = fetcher.state !== "idle";
  const result = fetcher.data;
  const errors = result && !result.ok ? (result.fieldErrors ?? {}) : {};

  const field = (name: string) => ({
    id: `${id}-${name}`,
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${id}-${name}-error` : undefined,
  });
  const error = (name: string) =>
    errors[name] ? (
      <p id={`${id}-${name}-error`} className="mt-2 text-xs text-[#d8798a]">
        {errors[name]}
      </p>
    ) : null;
  const label = "mb-2 block text-[0.625rem] tracking-[0.28em] text-[#a89d8e] uppercase";

  return (
    <main id="main-content" tabIndex={-1} className="flex-1">
      <PageHeader
        kicker="Contact"
        title="Write to"
        italic="the house"
        lede="For orders, fragrances, press, or anything else. Order questions are answered fastest with your order number."
        origin={root?.origin}
        crumbs={[
          { name: "House", path: "/" },
          { name: "Contact", path: "/contact" },
        ]}
      />
      <section className="max-w-page px-margin mx-auto w-full pb-28">
        <div className="sv-panel sv-frame max-w-3xl p-8 md:p-12">
          {result?.ok ? (
            <p role="status" className="font-heading text-2xl text-[#e5d8c5] italic">
              {result.message}
            </p>
          ) : (
            <fetcher.Form method="post" action="/api/contact" noValidate className="grid gap-8">
              <div className="grid gap-8 md:grid-cols-2">
                <div>
                  <label htmlFor={`${id}-name`} className={label}>
                    Name
                  </label>
                  <input type="text" autoComplete="name" required maxLength={120} {...field("name")} />
                  {error("name")}
                </div>
                <div>
                  <label htmlFor={`${id}-email`} className={label}>
                    Email
                  </label>
                  <input type="email" autoComplete="email" required maxLength={254} {...field("email")} />
                  {error("email")}
                </div>
              </div>
              <fieldset>
                <legend className={label}>Regarding</legend>
                <div className="flex flex-wrap gap-2">
                  {TOPICS.map((topic, index) => (
                    <label key={topic.value} className="cursor-pointer">
                      <input
                        type="radio"
                        name="topic"
                        value={topic.value}
                        defaultChecked={index === 0}
                        className="peer sr-only"
                      />
                      <span className="inline-flex min-h-11 items-center border border-[#b59660]/25 px-4 text-sm text-[#e5d8c5]/80 transition-colors peer-checked:border-[#b59660] peer-checked:bg-[#b59660]/10 peer-checked:text-[#e5d8c5] peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-[#b59660]">
                        {topic.label}
                      </span>
                    </label>
                  ))}
                </div>
                {error("topic")}
              </fieldset>
              <div>
                <label htmlFor={`${id}-message`} className={label}>
                  Message
                </label>
                <textarea rows={7} required minLength={10} maxLength={4000} {...field("message")} />
                {error("message")}
              </div>
              <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                <label>
                  Website
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-6">
                <button type="submit" disabled={busy} className="sv-button sv-button--solid">
                  {busy ? "Sending…" : "Send message"}
                </button>
                <p aria-live="polite" className="text-sm text-[#d8798a]">
                  {result && !result.ok ? result.message : ""}
                </p>
              </div>
              <p className="text-xs text-[#a89d8e]">
                We use your details only to reply to you. See our{" "}
                <a href="/privacy" className="underline decoration-[#b59660]/50 underline-offset-2">
                  privacy policy
                </a>
                .
              </p>
            </fetcher.Form>
          )}
        </div>
      </section>
    </main>
  );
}
