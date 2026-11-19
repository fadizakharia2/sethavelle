import { AnimatePresence, m } from "motion/react";
import { useEffect, useId } from "react";
import { useFetcher } from "react-router";

import { Icon } from "~/components/brand/Icon";
import type { FormResult } from "~/lib/forms";
import { trackNewsletterSignup } from "~/lib/marketing";

/**
 * Progressive enhancement: a plain POST without JavaScript, a fetcher with it.
 * The submit button disables while in flight (duplicate-submit guard); the
 * server also de-duplicates.
 */
export function NewsletterForm({ variant = "footer" }: { variant?: "footer" | "feature" }) {
  const fetcher = useFetcher<FormResult>();
  const id = useId();
  const busy = fetcher.state !== "idle";
  const result = fetcher.data;
  const fieldErrors = result && !result.ok ? result.fieldErrors : undefined;
  const emailError = fieldErrors?.email;
  const consentError = fieldErrors?.consent;
  const succeeded = result?.ok === true;

  // Consent-gated inside the marketing layer; no email or PII is sent.
  useEffect(() => {
    if (succeeded) trackNewsletterSignup();
  }, [succeeded]);

  if (result?.ok) {
    return (
      <m.p
        role="status"
        initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        className="font-heading text-xl text-[#e5d8c5] italic"
      >
        {result.message}
      </m.p>
    );
  }

  return (
    <fetcher.Form
      method="post"
      action="/api/newsletter"
      noValidate
      className="w-full"
      aria-describedby={`${id}-status`}
    >
      <div
        className={`flex items-end gap-0 border-b ${emailError ? "border-[#d8798a]" : "border-[#b59660]/50"} focus-within:border-[#b59660]`}
      >
        <label htmlFor={`${id}-email`} className="sr-only">
          Email address
        </label>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          maxLength={254}
          placeholder="Your email address"
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? `${id}-email-error` : undefined}
          className={`!border-0 !bg-transparent !px-0 !outline-none ${variant === "feature" ? "font-heading !py-4 !text-2xl" : "!py-3"}`}
        />
        <button
          type="submit"
          disabled={busy}
          aria-label="Subscribe"
          className="inline-flex size-12 shrink-0 items-center justify-center text-[#b59660] transition-transform hover:translate-x-1 disabled:opacity-40"
        >
          {busy ? (
            <span className="size-3 animate-spin border border-[#b59660] border-t-transparent" />
          ) : (
            <Icon name="arrow" />
          )}
        </button>
      </div>
      {/* Honeypot: hidden from people and assistive tech, attractive to bots */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
      <label className="mt-4 flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-[#a89d8e]">
        <input
          type="checkbox"
          name="consent"
          value="yes"
          required
          aria-invalid={consentError ? true : undefined}
          className="mt-0.5 size-4 shrink-0 cursor-pointer appearance-none border border-[#b59660]/60 checked:bg-[#b59660] checked:shadow-[inset_0_0_0_3px_#0b0b0d]"
        />
        <span>
          I would like to receive letters from SETHAVELLE about launches and private events. Unsubscribe at
          any time. See our{" "}
          <a href="/privacy" className="underline decoration-[#b59660]/50 underline-offset-2">
            privacy policy
          </a>
          .
        </span>
      </label>
      <div id={`${id}-status`} aria-live="polite" className="mt-3 min-h-5 text-xs">
        <AnimatePresence mode="wait">
          {emailError || consentError || (result && !result.ok) ? (
            <m.p
              key={emailError ?? consentError ?? result?.message}
              id={emailError ? `${id}-email-error` : undefined}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-[#d8798a]"
            >
              {emailError ?? consentError ?? result?.message}
            </m.p>
          ) : null}
        </AnimatePresence>
      </div>
    </fetcher.Form>
  );
}
