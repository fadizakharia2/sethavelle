export const BRAND = {
  name: "SETHAVELLE",
  tagline: "The Divine Art of Darkness",
  description:
    "SETHAVELLE is a gothic fragrance house drawn from the myth of Seth, lord of storms and the desert, and from the candlelit rituals of a darker aristocracy.",
} as const;

export type NavItem = { label: string; to: string };

export const PRIMARY_NAV: readonly NavItem[] = [
  { label: "Shop", to: "/shop" },
  { label: "Collections", to: "/collections" },
  { label: "Mythology", to: "/mythology" },
  { label: "Our Story", to: "/our-story" },
];

export const FOOTER_NAV: readonly { title: string; items: readonly NavItem[] }[] = [
  {
    title: "The House",
    items: [
      { label: "Our Story", to: "/our-story" },
      { label: "The Mythology", to: "/mythology" },
      { label: "Contact", to: "/contact" },
    ],
  },
  {
    title: "Client Care",
    items: [
      { label: "FAQ", to: "/faq" },
      { label: "Shipping & Returns", to: "/shipping-returns" },
      { label: "Account", to: "/account" },
    ],
  },
  {
    title: "Legal",
    items: [
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Terms & Conditions", to: "/terms" },
      { label: "Cookie Preferences", to: "/cookies" },
    ],
  },
];
