// GET /api/session-status?session_id=cs_... (Cloudflare Pages Function)
// Tells the return page whether a Checkout Session was paid. Returns status fields only, no customer details.
import Stripe from "stripe";

export async function onRequestGet({ request, env }) {
  if (!env.STRIPE_SECRET_KEY) return Response.json({ error: "Payments are not set up yet." }, { status: 503 });
  const id = new URL(request.url).searchParams.get("session_id") || "";
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return Response.json({ error: "Invalid session." }, { status: 400 });

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-03-25.dahlia",
    httpClient: Stripe.createFetchHttpClient(),
  });
  try {
    const session = await stripe.checkout.sessions.retrieve(id);
    return Response.json({ status: session.status, payment_status: session.payment_status });
  } catch (err) {
    console.error("Session lookup failed:", err.message);
    return Response.json({ error: "Session not found." }, { status: 404 });
  }
}
