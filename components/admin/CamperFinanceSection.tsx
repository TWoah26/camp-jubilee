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
  sessionTuitionAmount: number;
  initialTuitionCommitment: number;
  initialTuitionPaid: number;
}

export default function CamperFinanceSection({
  camperId,
  sessionId,
  initialBalance,
  initialTransactions,
  initialPayments,
  sessionTuitionAmount,
  initialTuitionCommitment,
  initialTuitionPaid,
}: Props) {
  const [balance, setBalance] = useState(initialBalance);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [payments, setPayments] = useState(initialPayments);
  const [tuitionCommitment, setTuitionCommitment] = useState(initialTuitionCommitment);
  const [tuitionPaid] = useState(initialTuitionPaid);
  const [editingCommitment, setEditingCommitment] = useState(false);
  const [commitmentInput, setCommitmentInput] = useState(
    initialTuitionCommitment > 0 ? String(initialTuitionCommitment) : ""
  );
  const [savingCommitment, setSavingCommitment] = useState(false);

  const effectiveCommitment = tuitionCommitment > 0 ? tuitionCommitment : sessionTuitionAmount;
  const balanceDue = effectiveCommitment - tuitionPaid;

  const saveCommitment = async () => {
    setSavingCommitment(true);
    const parsed = parseFloat(commitmentInput);
    const value = isNaN(parsed) || commitmentInput.trim() === "" ? 0 : parsed;
    const res = await fetch("/api/admin/campers/tuition-commitment", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ camper_id: camperId, tuition_commitment: value }),
    });
    if (res.ok) {
      setTuitionCommitment(value);
      setCommitmentInput(value > 0 ? String(value) : "");
    }
    setSavingCommitment(false);
    setEditingCommitment(false);
  };

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
      {/* Tuition summary card */}
      <div className="bg-white rounded-2xl shadow p-5">
        <h2 className="font-semibold text-jubilee-navy mb-4">Tuition</h2>
        <div className="space-y-3 text-sm">
          {/* Session cost */}
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Session Cost</span>
            <span className="font-medium">{formatCurrency(sessionTuitionAmount)}</span>
          </div>

          {/* Commitment */}
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Commitment</span>
            {editingCommitment ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={commitmentInput}
                  onChange={e => setCommitmentInput(e.target.value)}
                  placeholder={String(sessionTuitionAmount)}
                  className="w-28 border border-jubilee-gold rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-jubilee-gold text-right"
                  autoFocus
                  onKeyDown={e => { if (e.key === "Enter") saveCommitment(); if (e.key === "Escape") setEditingCommitment(false); }}
                />
                <button
                  onClick={saveCommitment}
                  disabled={savingCommitment}
                  className="text-xs bg-jubilee-green text-white px-2 py-1 rounded-lg disabled:opacity-50"
                >
                  {savingCommitment ? "…" : "Save"}
                </button>
                <button
                  onClick={() => setEditingCommitment(false)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {tuitionCommitment > 0
                    ? formatCurrency(tuitionCommitment)
                    : <span>{formatCurrency(sessionTuitionAmount)} <span className="text-xs text-gray-400 font-normal">(session default)</span></span>
                  }
                </span>
                <button
                  onClick={() => { setEditingCommitment(true); setCommitmentInput(tuitionCommitment > 0 ? String(tuitionCommitment) : ""); }}
                  className="text-gray-400 hover:text-jubilee-navy transition-colors"
                  title="Edit commitment"
                >
                  ✏️
                </button>
              </div>
            )}
          </div>

          {/* Total paid */}
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Total Paid</span>
            <span className="font-medium text-jubilee-green">{formatCurrency(tuitionPaid)}</span>
          </div>

          {/* Balance due */}
          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <span className="font-semibold text-jubilee-navy">Balance Due</span>
            <span className={`font-bold text-lg ${balanceDue > 0 ? "text-red-500" : "text-jubilee-green"}`}>
              {formatCurrency(Math.max(0, balanceDue))}
            </span>
          </div>
        </div>
      </div>

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
