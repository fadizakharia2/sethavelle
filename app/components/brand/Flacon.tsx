import { useId } from "react";

import type { FragranceConcept } from "~/content/fragrances";

/**
 * Art-directed flacon illustration used where Shopify has no photography yet.
 * It is an illustration, not a product photo, and its accessible name says so.
 * The faceted obsidian cap, gold collar and engraved sigil are original.
 */
export function Flacon({
  concept,
  className = "",
  label = true,
}: {
  concept: Pick<FragranceConcept, "name" | "numeral" | "palette">;
  className?: string;
  label?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const { liquid, glow, accent } = concept.palette;

  return (
    <svg
      viewBox="0 0 240 420"
      className={className}
      role="img"
      aria-label={`Illustrated flacon for ${concept.name} (illustration, not product photography)`}
    >
      <defs>
        <linearGradient id={`glass-${id}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="0.18" stopColor="#ffffff" stopOpacity="0.03" />
          <stop offset="0.7" stopColor="#000000" stopOpacity="0.1" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id={`liquid-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={glow} stopOpacity="0.9" />
          <stop offset="0.55" stopColor={liquid} />
          <stop offset="1" stopColor="#050304" />
        </linearGradient>
        <linearGradient id={`cap-${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#2b282e" />
          <stop offset="0.38" stopColor="#0d0c0f" />
          <stop offset="0.62" stopColor="#1c1a1f" />
          <stop offset="1" stopColor="#060607" />
        </linearGradient>
        <linearGradient id={`gold-${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#6e5733" />
          <stop offset="0.45" stopColor={accent} />
          <stop offset="0.55" stopColor="#efd9a6" />
          <stop offset="1" stopColor="#6e5733" />
        </linearGradient>
        <radialGradient id={`floor-${id}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={glow} stopOpacity="0.45" />
          <stop offset="1" stopColor={glow} stopOpacity="0" />
        </radialGradient>
        <clipPath id={`body-${id}`}>
          <path d="M52 168 L72 150 H168 L188 168 V378 L178 390 H62 L52 378 Z" />
        </clipPath>
      </defs>

      {/* floor glow */}
      <ellipse cx="120" cy="398" rx="110" ry="16" fill={`url(#floor-${id})`} />

      {/* cap: faceted obelisk */}
      <path d="M96 22 L120 6 L144 22 V122 H96 Z" fill={`url(#cap-${id})`} />
      <path d="M120 6 V122" stroke="#ffffff" strokeOpacity="0.07" />
      <path d="M96 22 L120 6 L144 22" fill="none" stroke={accent} strokeOpacity="0.55" strokeWidth="0.75" />
      {/* collar */}
      <rect x="88" y="122" width="64" height="10" fill={`url(#gold-${id})`} />
      <rect x="100" y="132" width="40" height="18" fill="#0e0d10" />
      <rect x="100" y="132" width="40" height="2" fill={accent} opacity="0.5" />

      {/* body */}
      <g clipPath={`url(#body-${id})`}>
        <rect x="40" y="140" width="160" height="260" fill="#09080a" />
        <rect x="40" y="196" width="160" height="210" fill={`url(#liquid-${id})`} />
        <rect x="40" y="196" width="160" height="1.2" fill="#ffffff" opacity="0.25" />
        <rect x="40" y="140" width="160" height="260" fill={`url(#glass-${id})`} />
        <rect
          className="sv-flacon-glint"
          x="62"
          y="150"
          width="8"
          height="240"
          fill="#ffffff"
          opacity="0.12"
        />
      </g>
      <path
        d="M52 168 L72 150 H168 L188 168 V378 L178 390 H62 L52 378 Z"
        fill="none"
        stroke={accent}
        strokeOpacity="0.45"
        strokeWidth="0.75"
      />

      {/* engraved sigil */}
      <g stroke={accent} strokeWidth="0.7" fill="none" opacity="0.9">
        <circle cx="120" cy="262" r="20" />
        <circle cx="120" cy="262" r="13" opacity="0.6" />
        <path d="M120 230 V300 M120 233 L128 229 L130 232 L124 235 M120 294 L115 301 M120 294 L125 301" />
      </g>

      {label ? (
        <g fill={accent} fontFamily="'Bodoni Moda Variable', Georgia, serif" textAnchor="middle">
          <text x="120" y="330" fontSize="9" letterSpacing="4.2">
            SETHAVELLE
          </text>
          <text x="120" y="350" fontSize="11" fontStyle="italic" letterSpacing="0.5" opacity="0.85">
            {concept.name}
          </text>
          <text x="120" y="368" fontSize="7" letterSpacing="3" opacity="0.6">
            {concept.numeral}
          </text>
        </g>
      ) : null}
    </svg>
  );
}
