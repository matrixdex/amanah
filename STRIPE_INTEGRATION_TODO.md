# Stripe integration: remaining setup

Stripe's embedded payment form (Checkout, `ui_mode: "form"`) is wired into **web_5 (Bento)** only. The other designs keep their old demo checkout.

## Values to Replace

The following values are placeholders and must be updated before going live.

**Files containing placeholders:**
- [functions/api/create-checkout-session.js](functions/api/create-checkout-session.js)
- [.env.example](.env.example) (copy to `.dev.vars` locally; add the real values as Cloudflare secrets in production)

| Field | Current Value | What to Set |
|-------|--------------|-------------|
| mode | payment | Keep `"payment"`: all products are one-time purchases. Use `"subscription"` only if you later sell recurring products. |
| STRIPE_PUBLISHABLE_KEY | pk_test_... | Publishable key from https://dashboard.stripe.com/test/apikeys |
| STRIPE_SECRET_KEY | sk_test_... | Secret key from the same page. Never put it in the site files. |
| STRIPE_WEBHOOK_SECRET | whsec_... | Signing secret of the webhook endpoint you create for `/api/webhook`. |

**No Stripe Price IDs are needed.** `line_items` are built on the server from the site's own `products.json` (product name, subtitle, image and price in GBP), using Stripe's inline `price_data`. The browser sends only product ids and quantities, so customers cannot change a price. To change a price, edit `web_5/products.json` and redeploy; Stripe charges the new price on the next order. The prices in `products.json` are still placeholders (£45, £30, £30, £45, £30): set your real prices there.

## Configured Parameters

These parameters were configured in Checkout Studio and are already set correctly.

**Files containing these parameters:**
- [functions/api/create-checkout-session.js](functions/api/create-checkout-session.js)
- [web_5/app.js](web_5/app.js) (appearance and form layout)

| Parameter | Value |
|-----------|-------|
| ui_mode | form |
| line_items | built from `products.json` with `price_data` (currency `gbp`, amount in pence, product name, subtitle, image) |
| billing_address_collection | auto |
| phone_number_collection | { enabled: false } |
| automatic_tax | { enabled: false } |
| submit_type | auto |
| integration_identifier | custom_embedded_web_0001 |
| shipping_address_collection | `allowed_countries` from `shipsTo` in `web_5/products.json` (currently `GB`, UK only) |
| shipping_options | one fixed rate, "UK delivery", amount from `shippingFlat` in `web_5/products.json` (currently £10, no free-shipping threshold) |
| return_url | `https://<site>/?checkout=complete&session_id={CHECKOUT_SESSION_ID}` (added in code, not in Checkout Studio: the embedded form needs it to finish payments) |
| payment_method_collection | always (only sent if `mode` is changed to `"subscription"`; Stripe allows it only in that mode) |
| Stripe API version | 2026-03-25.dahlia (server), Stripe.js `https://js.stripe.com/dahlia/stripe.js` (browser) |
| Appearance | theme `flat`, labels `auto`, inputs `condensed`, colours and spacing as configured |
| Form layout | expanded |

## Setup

1. **Hosting (Cloudflare Pages).** Connect the repository to a Cloudflare Pages project:
   - Root directory: the repository root (where `functions/` and `package.json` are).
   - Build output directory: `web_5`.
   - Build command: none. If the deploy log says `stripe` cannot be resolved, set it to `npm install`.
   The `functions/` folder becomes the `/api/...` routes on the same domain as the site.
2. **Environment variables.** In Pages, open Settings, then Variables and Secrets, and add `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` (use **Secret** type for the last two). Use test keys first.
3. **Dependencies.** `package.json` pins the `stripe` Node SDK `^23.2.0`, which supports `ui_mode: "form"` and Cloudflare Workers. Run `npm install` for local development.
4. **Local development.** Copy `.env.example` to `.dev.vars`, fill in test keys, then run `npx wrangler pages dev web_5` from the repository root and open the printed URL. `.dev.vars`, `.env` and `node_modules` are git-ignored.
5. **Webhook.** In the Stripe Dashboard (Workbench, then Webhooks) add an endpoint `https://<your-domain>/api/webhook` listening to `checkout.session.completed`, and put its signing secret in `STRIPE_WEBHOOK_SECRET`. For local testing: `stripe listen --forward-to localhost:8788/api/webhook`.

## Files added or changed

```
functions/api/create-checkout-session.js   POST: builds the Checkout Session from products.json, returns { client_secret, publishable_key }
functions/api/webhook.js                    POST: verifies the Stripe signature, handles checkout.session.completed
functions/api/session-status.js             GET: tells the return page whether a session is complete (status only, no customer data)
package.json, package-lock.json             stripe SDK dependency
.env.example                                key names for local development
.gitignore                                  keeps keys and node_modules out of git
web_5/app.js                                Checkout panel mounts Stripe's form instead of the demo form
web_5/index.html, shop.html, product.html   load https://js.stripe.com/dahlia/stripe.js
web_5/styles.css                            small styles for the form container
```

## How it works

1. The customer clicks **Checkout** in the cart drawer. The checkout panel opens with the order summary on one side.
2. `web_5/app.js` sends the cart (product ids and quantities only) to `POST /api/create-checkout-session`.
3. The function reads `products.json` from the deployed site, builds each line item from the product's name and price there, creates a Checkout Session with the configured parameters, and returns the session's client secret and the publishable key. Unknown or unavailable products are ignored.
4. The browser loads Stripe.js from Stripe (never self-hosted), calls `stripe.initCheckoutFormSdk(...)` with the configured appearance, and mounts the payment form into `#checkout-form`. Card details stay inside Stripe's iframe.
5. When the customer submits, the form's `confirm` event calls `actions.confirm({ formConfirmEvent, redirect: "if_required" })`. Card payments finish on the page: the cart is cleared and a thank-you message shows. Payment methods that need a redirect send the customer to the `return_url`; the homepage then asks `/api/session-status` whether the session is complete before clearing the cart and thanking them. Any error appears under the form.
6. Stripe sends `checkout.session.completed` to `/api/webhook`. That is the reliable signal that an order is paid; fulfil orders there, not in the browser.

If the API or Stripe.js cannot be reached, the panel shows an error instead of the form and nothing is charged.

## Testing

Use test-mode keys (`pk_test_...`, `sk_test_...`). Any future expiry date, any CVC and any postcode work.

| Card number | Result |
|-------------|--------|
| 4242 4242 4242 4242 | Payment succeeds |
| 4000 0025 0000 3155 | Requires 3D Secure authentication |
| 4000 0000 0000 9995 | Declined (insufficient funds) |
| 4000 0000 0000 0002 | Declined (generic) |

More test cards: https://docs.stripe.com/testing. Check results under Payments and Events in the test-mode Dashboard. Switch to live keys only after a full test order and webhook delivery succeed.

## Next steps

- **Shipping.** Done: the form collects a UK delivery address and adds a flat £10 "UK delivery" charge to every order. To change the rate or add countries, edit `shippingFlat` and `shipsTo` (two-letter country codes such as `GB`, `IE`) in `web_5/products.json` and redeploy. The cart drawer, checkout summary and Stripe all read the same values. The FAQ on the homepage mentions £10 and UK-only delivery in plain text, so update it too if the policy changes.
- **VAT.** `automatic_tax` is off. If you're VAT-registered, enable Stripe Tax, set product tax codes, and turn `automatic_tax` on.
- **Fulfilment.** In `functions/api/webhook.js`, on `checkout.session.completed`: send the order email (Postmark or Resend), create the Sendcloud label, and store the order (Cloudflare D1).
- **Order tracking.** Save `session.id`, the PaymentIntent id and customer email with each order so refunds and customer questions can be traced.
- **Moving web_5 to the repository root.** Keep `functions/`, `package.json` and `package-lock.json` at the root; the site calls `/api/...` with absolute paths, and the function reads `/products.json` from the site root, so set the Pages build output directory to wherever `products.json` ends up.
- **Other designs.** web_1, web_3 and web_4 still use the old demo checkout, which takes no payment.

## Resources

- Stripe support: https://support.stripe.com
- Stripe MCP (use Stripe from AI tools): https://docs.stripe.com/mcp
- Checkout Sessions API: https://docs.stripe.com/api/checkout/sessions/create
- Cloudflare Pages Functions: https://developers.cloudflare.com/pages/functions/
