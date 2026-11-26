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
| line_items[].price (Overnight Breakfast Muesli) | price_... | Price ID for the muesli, from the Dashboard (https://dashboard.stripe.com/prices) or API. Set it in `PRICE_IDS["overnight-breakfast-muesli"]`. |
| line_items[].price (Joint Support Oil) | price_... | Price ID, set in `PRICE_IDS["joint-support-oil"]`. |
| line_items[].price (Bowel Ease Concept) | price_... | Price ID, set in `PRICE_IDS["bowel-ease-concept"]`. |
| line_items[].price (Detox Powder) | price_... | Price ID, set in `PRICE_IDS["detox-powder"]`. |
| line_items[].price (TGF Powder) | price_... | Price ID, set in `PRICE_IDS["tgf-powder"]`. |
| STRIPE_PUBLISHABLE_KEY | pk_test_... | Publishable key from https://dashboard.stripe.com/test/apikeys |
| STRIPE_SECRET_KEY | sk_test_... | Secret key from the same page. Never put it in the site files. |
| STRIPE_WEBHOOK_SECRET | whsec_... | Signing secret of the webhook endpoint you create for `/api/webhook`. |

Create each Price in GBP at the amount in `web_5/products.json` (the placeholder prices there are £45, £30, £30, £45 and £30). The function only accepts product ids and quantities from the browser, so Stripe always charges the Price you set in the Dashboard. Keep `products.json` and the Stripe Prices in step.

## Configured Parameters

These parameters were configured in Checkout Studio and are already set correctly.

**Files containing these parameters:**
- [functions/api/create-checkout-session.js](functions/api/create-checkout-session.js)
- [web_5/app.js](web_5/app.js) (appearance and form layout)

| Parameter | Value |
|-----------|-------|
| ui_mode | form |
| billing_address_collection | auto |
| phone_number_collection | { enabled: false } |
| automatic_tax | { enabled: false } |
| submit_type | auto |
| integration_identifier | custom_embedded_web_0001 |
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
functions/api/create-checkout-session.js   POST: builds the Checkout Session, returns { client_secret, publishable_key }
functions/api/webhook.js                    POST: verifies the Stripe signature, handles checkout.session.completed
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
3. The function maps each product to its Stripe Price ID, creates a Checkout Session with the configured parameters, and returns the session's client secret and the publishable key.
4. The browser loads Stripe.js from Stripe (never self-hosted), calls `stripe.initCheckoutFormSdk(...)` with the configured appearance, and mounts the payment form into `#checkout-form`. Card details stay inside Stripe's iframe.
5. When the customer submits, the form's `confirm` event calls `actions.confirm(...)`. On success the cart is cleared and a thank-you message shows; on failure Stripe's message appears under the form.
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

- **Shipping (needed before launch).** The session does not collect a shipping address or charge shipping yet, so Stripe charges the product subtotal only. The checkout summary shows that same total, but the cart drawer still mentions £5 shipping and free shipping over £60. Add `shipping_address_collection` (allowed countries) and `shipping_options` (your £5 rate, and a free rate for orders of £60 or more) to the session, or turn them on in Checkout Studio, then update the summary.
- **VAT.** `automatic_tax` is off. If you're VAT-registered, enable Stripe Tax, set product tax codes, and turn `automatic_tax` on.
- **Fulfilment.** In `functions/api/webhook.js`, on `checkout.session.completed`: send the order email (Postmark or Resend), create the Sendcloud label, and store the order (Cloudflare D1).
- **Order tracking.** Save `session.id`, the PaymentIntent id and customer email with each order so refunds and customer questions can be traced.
- **Moving web_5 to the repository root.** Keep `functions/`, `package.json` and `package-lock.json` at the root; the site calls `/api/...` with absolute paths, so nothing else changes.
- **Other designs.** web_1, web_3 and web_4 still use the old demo checkout, which takes no payment.

## Resources

- Stripe support: https://support.stripe.com
- Stripe MCP (use Stripe from AI tools): https://docs.stripe.com/mcp
- Checkout Sessions API: https://docs.stripe.com/api/checkout/sessions/create
- Cloudflare Pages Functions: https://developers.cloudflare.com/pages/functions/
