import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { SquareClient, SquareEnvironment } from "square";

const squareClient = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
  environment: process.env.NODE_ENV === "production" ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
});

export async function POST(req: Request) {
  try {
    const { camper_id, parent_id, amount, type } = await req.json();

    const supabase = await createClient();
    const { data: camper } = await supabase
      .from("campers")
      .select("first_name, last_name")
      .eq("id", camper_id)
      .single();

    const lineItemName =
      type === "deposit" ? `Deposit – ${camper?.first_name} ${camper?.last_name}` :
      type === "balance" ? `Registration Fee – ${camper?.first_name} ${camper?.last_name}` :
      `Store Credit – ${camper?.first_name} ${camper?.last_name}`;

    const idempotencyKey = `${parent_id}-${camper_id}-${type}-${Date.now()}`;
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
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/square-callback?camper_id=${camper_id}&parent_id=${parent_id}&type=${type}&amount=${amount}`,
      },
    });

    return NextResponse.json({ payment_link: response.paymentLink?.url });
  } catch (err: any) {
    console.error("Square checkout error:", JSON.stringify(err?.errors ?? err?.message ?? err, null, 2));
    const message = err?.errors?.[0]?.detail ?? err?.message ?? "Payment setup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
