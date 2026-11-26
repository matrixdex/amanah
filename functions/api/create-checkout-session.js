// POST /api/create-checkout-session (Cloudflare Pages Function)
// Creates a Stripe Checkout Session for the embedded payment form and returns its client secret.
// Keys come from environment variables; see STRIPE_INTEGRATION_TODO.md.
import Stripe from "stripe";

// Stripe Price ID for each product id in products.json.
// TODO: replace each "price_..." with the real Price ID from the Stripe Dashboard.
const PRICE_IDS = {
  "overnight-breakfast-muesli": "price_...",
  "joint-support-oil": "price_...",
  "bowel-ease-concept": "price_...",
  "detox-powder": "price_...",
  "tgf-powder": "price_...",
};

export async function onRequestPost({ request, env }) {
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-03-25.dahlia",
    httpClient: Stripe.createFetchHttpClient(),
  });

  // The cart sends product ids and quantities only; prices are never taken from the browser.
  let body = {};
  try { body = await request.json(); } catch (e) {}
  const quantities = {};
  for (const item of Array.isArray(body.items) ? body.items : []) {
    if (!item || !PRICE_IDS[item.id]) continue;
    const q = Math.max(1, Math.min(20, parseInt(item.quantity, 10) || 1));
    quantities[item.id] = Math.min(20, (quantities[item.id] || 0) + q);
  }
  const line_items = Object.entries(quantities).map(([id, quantity]) => ({ price: PRICE_IDS[id], quantity }));
  if (!line_items.length) return Response.json({ error: "Your cart is empty." }, { status: 400 });

  // TODO: Set mode to "subscription" if selling recurring products.
  const mode = "payment";

  const sessionParams = {
    ui_mode: "form",
    mode,
    line_items,
    billing_address_collection: "auto",
    phone_number_collection: { enabled: false },
    automatic_tax: { enabled: false },
    submit_type: "auto",
    integration_identifier: "custom_embedded_web_0001",
  };
  if (mode === "subscription") {
    sessionParams.payment_method_collection = "always";
  }

  try {
    const session = await stripe.checkout.sessions.create(sessionParams);
    return Response.json({
      client_secret: session.client_secret,
      publishable_key: env.STRIPE_PUBLISHABLE_KEY,
    });
  } catch (err) {
    console.error("Checkout Session creation failed:", err.message);
    return Response.json({ error: "Checkout could not be started. Please try again." }, { status: 500 });
  }
}
