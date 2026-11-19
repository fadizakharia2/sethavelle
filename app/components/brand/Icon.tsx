import type { SVGProps } from "react";

const PATHS = {
  search: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Zm4.6-1.9L20 20",
  bag: "M5 8.5h14l-1 11.5H6L5 8.5Zm4 0V7a3 3 0 0 1 6 0v1.5",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5",
  close: "M6 6l12 12M18 6 6 18",
  menu: "M4 8h16M4 16h16",
  arrow: "M4 12h15m-5-5 5 5-5 5",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  chevron: "m8 10 4 4 4-4",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 20,
  strokeWidth = 1.1,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
