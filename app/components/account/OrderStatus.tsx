import type { ReactNode } from "react";

export function formatStatus(status: string | null | undefined) {
  if (!status) return null;
  const text = status.toLowerCase().replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const orderDate = new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" });

export function StatusPill({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <span className="inline-flex items-center gap-2 border border-[#b59660]/30 px-2.5 py-1 text-[0.5625rem] tracking-[0.24em] text-[#e5d8c5]/85 uppercase">
      <span aria-hidden="true" className="size-1 rotate-45 bg-[#b59660]" />
      {children}
    </span>
  );
}
