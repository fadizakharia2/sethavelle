import type { SVGProps } from "react";

/**
 * The house sigil: a sun disk pierced by a forked sceptre whose head is cut at
 * a hard angle — an abstraction of Seth's was-sceptre, drawn in a single gold
 * hairline. Original artwork; purely decorative unless given a title.
 */
export function Sigil({
  title,
  drawn = 1,
  ...props
}: SVGProps<SVGSVGElement> & { title?: string; drawn?: number }) {
  const dash = 420;
  const strokeProps = {
    pathLength: 1,
    strokeDasharray: 1,
    strokeDashoffset: 1 - drawn,
  };
  return (
    <svg
      viewBox="0 0 100 120"
      fill="none"
      stroke="currentColor"
      strokeWidth={0.75}
      strokeLinecap="square"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <circle cx="50" cy="52" r="34" {...strokeProps} />
      <circle cx="50" cy="52" r="22" {...strokeProps} opacity={0.65} />
      {/* sceptre shaft */}
      <path d="M50 6 V112" {...strokeProps} />
      {/* angled head */}
      <path d="M50 10 L63 4 L66 9 L56 13" {...strokeProps} />
      {/* fork */}
      <path d="M50 104 L43 114 M50 104 L57 114" {...strokeProps} />
      {/* horizon bar and tick marks */}
      <path d="M14 52 H28 M72 52 H86" {...strokeProps} />
      <path d="M50 18 v4 M50 82 v4" {...strokeProps} strokeDasharray={dash} strokeDashoffset={0} />
      <circle cx="50" cy="52" r="1.6" fill="currentColor" stroke="none" opacity={drawn} />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-heading tracking-[0.42em] uppercase [font-variation-settings:'opsz'_11] ${className}`}
    >
      Sethavelle
    </span>
  );
}
