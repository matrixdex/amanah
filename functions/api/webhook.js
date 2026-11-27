// POST /api/webhook (Cloudflare Pages Function)
// Receives Stripe events. Point a webhook endpoint in the Stripe Dashboard at https://<your-domain>/api/webhook.
import Stripe from "stripe";

export async function onRequestPost({ request, env }) {
  if (!env.STRIPE_WEBHOOK_SECRET || !env.STRIPE_SECRET_KEY) return new Response("Stripe keys not configured", { status: 500 });

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-03-25.dahlia",
    httpClient: Stripe.createFetchHttpClient(),
  });

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      await request.text(),
      request.headers.get("stripe-signature"),
      env.STRIPE_WEBHOOK_SECRET,
      undefined,
      Stripe.createSubtleCryptoProvider()
    );
  } catch (err) {
    console.log("Webhook signature verification failed.", err.message);
    return new Response("Invalid signature", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      console.log("Checkout completed:", session.id);
      // TODO: fulfil the order here (order email, Sendcloud label, order record).
      break;
    }
    default:
      console.log("Unhandled event type:", event.type);
  }

  return new Response(null, { status: 200 });
}
