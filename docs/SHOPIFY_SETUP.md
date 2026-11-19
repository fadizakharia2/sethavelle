# Shopify setup

What the store needs for this storefront to show real content. Nothing here is created by the code.

## 1. Sales channel and tokens

1. Install the **Hydrogen** sales channel and create a storefront (or link with
   `npx shopify hydrogen link`).
2. Oxygen then injects `PUBLIC_STORE_DOMAIN`, `PUBLIC_STOREFRONT_ID`, `PRIVATE_STOREFRONT_API_TOKEN`.
   For local work run `npx shopify hydrogen env pull`.

## 2. Products

Create the three products with these **handles** (the home page features them by handle; any other
products appear normally in the shop):

| Handle             | Name             |
| ------------------ | ---------------- |
| `vampiric-royalty` | Vampiric Royalty |
| `darkness`         | Darkness         |
| `hellhound`        | Hellhound        |

Until a product exists its home panel reads "Forthcoming" with an illustrated flacon and no price.
Add product images (portrait 4:5 recommended), variants (e.g. size), prices and inventory in Shopify.

## 3. Metafield definitions

Settings → Custom data → Products. Namespace **`sethavelle`**, all _Storefront access: Read_.

| Key                | Type                     | Shown as                          |
| ------------------ | ------------------------ | --------------------------------- |
| `top_notes`        | List of single line text | Head (top) notes                  |
| `heart_notes`      | List of single line text | Heart notes                       |
| `base_notes`       | List of single line text | Base notes                        |
| `story`            | Multi-line text          | Story section on the product page |
| `concentration`    | Single line text         | e.g. "Extrait de Parfum"          |
| `olfactive_family` | Single line text         | e.g. "Oriental woody"             |

Empty metafields are simply not shown (or shown as "notes will be published by the house").
**Only enter facts confirmed by the perfumer.**

## 4. Collections

- A collection with handle **`all`** (or set `SHOP_ALL_COLLECTION_HANDLE`) powers `/shop`; make it an
  automated collection of all active products.
- Any other collection appears under `/collections`.

## 5. Policies

Settings → Policies: Privacy, Terms of service, Shipping, Refund. These render on `/privacy`,
`/terms` and `/shipping-returns`. Unpublished policies show a "not published yet" notice.

## 6. Customer accounts

Settings → Customer accounts → use **customer accounts** (not legacy). In the Hydrogen channel's
Customer Account API settings:

- Callback URI: `https://<your-domain>/account/authorize`
- JavaScript origin: `https://<your-domain>`
- Logout URI: `https://<your-domain>/`
  Then set `SHOP_ID`, `PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID` and `SESSION_SECRET`.
  Local testing needs `pnpm dev:https` (or a tunnel) because the flow requires HTTPS.

## 7. Privacy / cookie banner

Settings → Customer privacy: enable the cookie banner for the regions you sell in. The storefront
uses Shopify's banner (`consent.mode = default-banner`) and `/cookies` reopens its preferences.
