import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { SquareClient, SquareEnvironment } from "square";
import { createHmac } from "crypto";

export const dynamic = "force-dynamic";

const squareClient = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
  environment: process.env.NODE_ENV === "production" ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
});

// Verify Square's HMAC-SHA256 signature to ensure the event is authentic.
// Square signs with: HMAC-SHA256(notificationUrl + rawBody, signatureKey) → base64
function verifySquareSignature(rawBody: string, signature: string, notificationUrl: string): boolean {
  const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY ?? "";
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      console.error("SQUARE_WEBHOOK_SIGNATURE_KEY is not set in production — rejecting all webhook requests");
      return false;
    }
    // Allow in dev/preview without the key
    return true;
  }
  const hmac = createHmac("sha256", key);
  hmac.update(notificationUrl + rawBody);
  const expected = hmac.digest("base64");
  return expected === signature;
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-square-hmacsha256-signature") ?? "";
    const notificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/square-webhook`;

    if (!verifySquareSignature(rawBody, signature, notificationUrl)) {
      console.warn("Square webhook: invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);

    // We only care about payment.updated where status is COMPLETED
    if (event.type !== "payment.updated") {
      return NextResponse.json({ ok: true, skipped: event.type });
    }

    const payment = event.data?.object?.payment;
    if (payment?.status !== "COMPLETED") {
      return NextResponse.json({ ok: true, skipped: `status:${payment?.status}` });
    }

    const orderId = payment?.orderId;

    if (!orderId) {
      return NextResponse.json({ ok: true, skipped: "no_order_id" });
    }

    const admin = await createAdminClient();

    // Idempotency check — if the browser redirect already processed this order, skip
    const { data: existing } = await admin
      .from("store_transactions")
      .select("id")
      .eq("square_order_id", orderId)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ ok: true, skipped: "already_processed" });
    }

    // Fetch the order from Square to read metadata (allocations stored at link creation time)
    const orderResult = await squareClient.orders.get({ orderId });
    const order = orderResult.order;
    const metadata = order?.metadata ?? {};
    const type = metadata.type;
    const parentId = metadata.parent_id;
    const allocationsStr = metadata.allocations;

    if (type === "store_credit_multi" && allocationsStr && parentId) {
      const allocations = allocationsStr.split(",").map((pair: string) => {
        const [camper_id, amountStr] = pair.split(":");
        return { camper_id, amount: parseFloat(amountStr) };
      }).filter((a: { camper_id: string; amount: number }) => a.camper_id && a.amount > 0);

      if (allocations.length === 0) {
        console.error("Square webhook: store_credit_multi with empty allocations", { orderId });
        return NextResponse.json({ ok: true, skipped: "empty_allocations" });
      }

      const errors: string[] = [];
      await Promise.all(allocations.map(async ({ camper_id, amount }: { camper_id: string; amount: number }) => {
        // Insert transaction record first (this is what the idempotency check looks for)
        const { error: txError } = await admin.from("store_transactions").insert({
          camper_id,
          amount,
          type: "credit",
          note: "Parent top-up",
          payment_method: "square",
          staff_id: parentId,
          square_order_id: orderId,
        });
        if (txError) {
          errors.push(`tx:${camper_id}: ${txError.message}`);
          return;
        }
        // Atomic balance increment via Postgres function — avoids read-modify-write race
        const { error: balError } = await admin.rpc("add_store_balance", {
          p_camper_id: camper_id,
          p_amount: amount,
        });
        if (balError) errors.push(`bal:${camper_id}: ${balError.message}`);
      }));

      if (errors.length > 0) {
        console.error("Square webhook store credit errors:", errors);
        return NextResponse.json({ error: errors.join("; ") }, { status: 500 });
      }

      console.log(`Square webhook: applied store credit for order ${orderId}`, allocations);
      return NextResponse.json({ ok: true, applied: allocations.length });
    }

    // For payment types without metadata (older payment links), log and skip gracefully
    console.log(`Square webhook: unhandled type "${type}" for order ${orderId} — no action taken`);
    return NextResponse.json({ ok: true, skipped: `unhandled_type:${type ?? "none"}` });

  } catch (err: any) {
    console.error("Square webhook error:", err?.message ?? err);
    // Return 200 so Square doesn't keep retrying for non-transient errors
    return NextResponse.json({ error: "Internal error" }, { status: 200 });
  }
}
