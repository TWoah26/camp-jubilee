import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { SquareClient, SquareEnvironment } from "square";

const squareClient = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
  environment: process.env.NODE_ENV === "production" ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
});

export async function POST(req: Request) {
  try {
    const { camper_id, parent_id, amount, session_id } = await req.json();
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== parent_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const { data: link } = await supabase
      .from("parent_camper_links")
      .select("id")
      .eq("parent_id", parent_id)
      .eq("camper_id", camper_id)
      .eq("approved", true)
      .single();

    if (!link) {
      return NextResponse.json({ error: "Not authorized for this camper" }, { status: 403 });
    }

    const { data: camper } = await supabase
      .from("campers")
      .select("first_name, last_name")
      .eq("id", camper_id)
      .single();

    const lineItemName = `Registration Fee – ${camper?.first_name ?? ""} ${camper?.last_name ?? ""}`.trim();
    const idempotencyKey = `${parent_id}-${camper_id}-tuition-${Date.now()}`;
    const amountCents = Math.round(amount * 100);

    const response = await squareClient.checkout.paymentLinks.create({
      idempotencyKey,
      order: {
        locationId: process.env.SQUARE_LOCATION_ID!,
        lineItems: [{
          name: lineItemName,
          quantity: "1",
          basePriceMoney: { amount: BigInt(amountCents), currency: "USD" },
        }],
      },
      checkoutOptions: {
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/square-callback?camper_id=${camper_id}&parent_id=${parent_id}&type=tuition&amount=${amount}${session_id ? `&session_id=${session_id}` : ""}`,
      },
    });

    const paymentLink = response.paymentLink?.url;
    return NextResponse.json({ payment_link: paymentLink });
  } catch (err: any) {
    console.error("Tuition payment error:", JSON.stringify(err?.errors ?? err?.message ?? err, null, 2));
    const message = err?.errors?.[0]?.detail ?? err?.message ?? "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
