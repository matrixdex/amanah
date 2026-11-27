// POST /api/create-checkout-session (Cloudflare Pages Function)
// Creates a Stripe Checkout Session for the embedded payment form and returns its client secret.
// Keys come from environment variables; see STRIPE_INTEGRATION_TODO.md.
import Stripe from "stripe";

export async function onRequestPost({ request, env }) {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PUBLISHABLE_KEY) {
    console.error("STRIPE_SECRET_KEY or STRIPE_PUBLISHABLE_KEY is not set for this deployment.");
    return Response.json({ error: "Payments are not set up yet. Please try again later." }, { status: 503 });
  }
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-03-25.dahlia",
    httpClient: Stripe.createFetchHttpClient(),
  });

  // Product names and prices come from the site's own products.json, read here on the server.
  // The cart sends product ids and quantities only; prices are never taken from the browser.
  let db;
  try {
    const res = await env.ASSETS.fetch(new URL("/products.json", request.url));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    db = await res.json();
  } catch (err) {
    console.error("products.json could not be read:", err.message);
    return Response.json({ error: "Checkout could not be started. Please try again." }, { status: 500 });
  }
  const products = Object.fromEntries((db.products || []).filter((p) => p.available !== false).map((p) => [p.id, p]));
  const currency = String(db.currency || "GBP").toLowerCase();
  const origin = new URL(request.url).origin;

  let body = {};
  try { body = await request.json(); } catch (e) {}
  const quantities = {};
  for (const item of Array.isArray(body.items) ? body.items : []) {
    if (!item || !products[item.id]) continue;
    const q = Math.max(1, Math.min(20, parseInt(item.quantity, 10) || 1));
    quantities[item.id] = Math.min(20, (quantities[item.id] || 0) + q);
  }
  const line_items = Object.entries(quantities).map(([id, quantity]) => {
    const p = products[id];
    const product_data = { name: p.name };
    if (p.subtitle) product_data.description = p.subtitle;
    if (origin.startsWith("https://") && p.image) product_data.images = [new URL(p.image, origin + "/").href];
    return { price_data: { currency, unit_amount: Math.round(Number(p.price) * 100), product_data }, quantity };
  });
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
