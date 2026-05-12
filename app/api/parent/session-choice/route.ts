import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { SquareClient, SquareEnvironment } from "square";

const squareClient = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
  environment: process.env.NODE_ENV === "production" ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
});

export async function POST(req: Request) {
  try {
    const { camper_id, parent_id, session_id, choice, balance, donate_amount, refund_amount } = await req.json();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== parent_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase.from("session_balance_choices").insert({
      camper_id,
      parent_id,
      session_id,
      choice,
      balance_at_close: balance,
      donate_amount: donate_amount ?? 0,
      refund_amount: refund_amount ?? 0,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Auto-refund via Square if the parent chose a refund
    if (refund_amount > 0) {
      try {
        // Get store credit transactions for this camper that have a Square order ID
        const { data: transactions } = await supabase
          .from("store_transactions")
          .select("id, amount, square_order_id")
          .eq("camper_id", camper_id)
          .eq("type", "credit")
          .not("square_order_id", "is", null)
          .order("created_at", { ascending: false });

        if (transactions && transactions.length > 0) {
          let remaining = refund_amount;

          for (const tx of transactions) {
            if (remaining <= 0) break;

            // Look up the Square payment ID for this order
            const paymentsResult = await squareClient.payments.list({} as any);
            let squarePaymentId: string | undefined;
            for await (const payment of paymentsResult) {
              if ((payment as any).orderId === tx.square_order_id) {
                squarePaymentId = payment.id;
                break;
              }
            }

            if (!squarePaymentId) continue;

            // Refund as much as possible from this transaction (up to what remains)
            const refundFromThis = Math.min(remaining, tx.amount);

            await squareClient.refunds.refundPayment({
              idempotencyKey: `refund-${camper_id}-${session_id}-${tx.id}`,
              paymentId: squarePaymentId,
              amountMoney: {
                amount: BigInt(Math.round(refundFromThis * 100)),
                currency: "USD",
              },
              reason: "Session end balance refund",
            });

            remaining = parseFloat((remaining - refundFromThis).toFixed(2));
          }
        }
      } catch (refundErr: any) {
        console.error("Square refund error:", refundErr?.message ?? refundErr);
        // Don't block the response — choice is still recorded, director can refund manually if needed
      }
    }

    // Zero out the store balance since it's been allocated
    await supabase.from("campers").update({ store_balance: 0 }).eq("id", camper_id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
