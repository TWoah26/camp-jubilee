"use client";

import { useState } from "react";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import AddStoreCreditForm from "./AddStoreCreditForm";
import AddManualPaymentForm from "./AddManualPaymentForm";

interface Transaction {
  id: string;
  type: "credit" | "debit";
  amount: number;
  note: string | null;
  created_at: string;
}

interface Payment {
  id: string;
  amount: number;
  payment_method: string | null;
  notes: string | null;
  paid_at: string;
}

interface Props {
  camperId: string;
  sessionId: string | null;
  initialBalance: number;
  initialTransactions: Transaction[];
  initialPayments: Payment[];
}

export default function CamperFinanceSection({
  camperId,
  sessionId,
  initialBalance,
  initialTransactions,
  initialPayments,
}: Props) {
  const [balance, setBalance] = useState(initialBalance);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [payments, setPayments] = useState(initialPayments);

  const totalTuition = payments.reduce((sum, p) => sum + p.amount, 0);

  const handleCreditAdded = (newBalance: number) => {
    setBalance(newBalance);
    // Optimistically prepend a credit transaction
    setTransactions(prev => [{
      id: `temp-${Date.now()}`,
      type: "credit",
      amount: newBalance - balance,
      note: "Manual credit",
      created_at: new Date().toISOString(),
    }, ...prev]);
  };

  const handlePaymentRecorded = (amount: number) => {
    setPayments(prev => [{
      id: `temp-${Date.now()}`,
      amount,
      payment_method: null,
      notes: null,
      paid_at: new Date().toISOString(),
    }, ...prev]);
  };

  return (
    <div className="space-y-4">
      {/* Store balance card */}
      <div className="bg-jubilee-navy rounded-2xl shadow p-5 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-semibold mb-1">Store Balance</h2>
            <p className="text-4xl font-bold">{formatCurrency(balance)}</p>
          </div>
        </div>
        <div className="mt-3">
          <AddStoreCreditForm
            camperId={camperId}
            currentBalance={balance}
            onSuccess={handleCreditAdded}
          />
        </div>
      </div>

      {/* Store transactions */}
      <div className="bg-white rounded-2xl shadow p-5">
        <h2 className="font-semibold text-jubilee-navy mb-3">Store Transactions</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-gray-400">No transactions yet.</p>
        ) : (
          <div className="space-y-2">
            {transactions.map(tx => (
              <div key={tx.id} className="flex justify-between items-center py-2 border-b last:border-0 text-sm">
                <div>
                  <p className="font-medium">{tx.note || (tx.type === "credit" ? "Funds added" : "Purchase")}</p>
                  <p className="text-xs text-gray-400">{formatDateTime(tx.created_at)}</p>
                </div>
                <span className={`font-semibold ${tx.type === "credit" ? "text-jubilee-green" : "text-red-500"}`}>
                  {tx.type === "credit" ? "+" : "-"}{formatCurrency(Math.abs(tx.amount))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Registration payments */}
      <div className="bg-white rounded-2xl shadow p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-jubilee-navy">Registration Fee Payments</h2>
          <span className="text-sm text-jubilee-green font-semibold">{formatCurrency(totalTuition)} total</span>
        </div>
        {payments.length === 0 ? (
          <p className="text-sm text-gray-400 mb-3">No payments recorded.</p>
        ) : (
          <div className="space-y-2 mb-3">
            {payments.map(p => (
              <div key={p.id} className="flex justify-between items-center py-2 border-b last:border-0 text-sm">
                <div>
                  <p className="font-medium">{p.notes || "Payment"}{p.payment_method ? ` · ${p.payment_method}` : ""}</p>
                  <p className="text-xs text-gray-400">{formatDate(p.paid_at)}</p>
                </div>
                <span className="font-semibold text-jubilee-green">{formatCurrency(p.amount)}</span>
              </div>
            ))}
          </div>
        )}
        <AddManualPaymentForm
          camperId={camperId}
          sessionId={sessionId}
          onSuccess={handlePaymentRecorded}
        />
      </div>
    </div>
  );
}
