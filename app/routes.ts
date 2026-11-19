import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("shop", "routes/shop.tsx"),
  route("products/:handle", "routes/product.tsx"),
  route("collections", "routes/collections.tsx"),
  route("collections/:handle", "routes/collection.tsx"),
  route("cart", "routes/cart.tsx"),
  route("search", "routes/search.tsx"),

  // Customer accounts. /account/login, /authorize, /refresh and /logout are
  // owned by Hydrogen's Customer Account handlers in the root middleware.
  route("account", "routes/account.tsx", [
    index("routes/account._index.tsx"),
    route("orders", "routes/account.orders.tsx"),
    route("orders/:id", "routes/account.order.tsx"),
  ]),

  // Editorial
  route("our-story", "routes/our-story.tsx"),
  route("mythology", "routes/mythology.tsx"),
  route("contact", "routes/contact.tsx"),
  route("faq", "routes/faq.tsx"),
  route("shipping-returns", "routes/policy.tsx", { id: "policy-shipping" }),
  route("privacy", "routes/policy.tsx", { id: "policy-privacy" }),
  route("terms", "routes/policy.tsx", { id: "policy-terms" }),
  route("cookies", "routes/cookies.tsx"),

  // Endpoints
  route("api/newsletter", "routes/api.newsletter.ts"),
  route("api/contact", "routes/api.contact.ts"),
  route("robots.txt", "routes/robots.ts"),
  route("sitemap.xml", "routes/sitemap.ts"),

  route("*", "routes/catchall.tsx"),
] satisfies RouteConfig;
