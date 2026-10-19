"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createFeeCatalogItem } from "@/app/admin/invoices/actions";

export function AddFeeItemForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    startTransition(async () => {
      try {
        const result = await createFeeCatalogItem(name, description, amount);
        if (!result.ok) {
          setMessage(result.error);
          return;
        }
        setName("");
        setDescription("");
        setAmount("");
        setMessage(result.alreadyExists ? "A fee with that name already exists." : "Fee item added.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not add fee item.");
      }
    });
  }

  return <form className="grid gap-2 sm:grid-cols-[1fr_1.2fr_130px_auto]" onSubmit={submit}>
    <label className="sr-only" htmlFor="new-fee-name">Fee item name</label><input className="h-9 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-indigo-400" id="new-fee-name" maxLength={100} onChange={(event) => setName(event.target.value)} placeholder="Fee item name" required value={name} />
    <label className="sr-only" htmlFor="new-fee-description">Description</label><input className="h-9 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-indigo-400" id="new-fee-description" maxLength={240} onChange={(event) => setDescription(event.target.value)} placeholder="Description (optional)" value={description} />
    <label className="sr-only" htmlFor="new-fee-amount">Default amount</label><input className="h-9 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-indigo-400" id="new-fee-amount" min="0.01" onChange={(event) => setAmount(event.target.value)} placeholder="Amount (USD)" required step="0.01" type="number" value={amount} />
    <button className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60" disabled={isPending} type="submit"><Plus className="size-3.5" />{isPending ? "Adding…" : "Add fee"}</button>
    {message && <p aria-live="polite" className="text-xs text-slate-500 sm:col-span-4">{message}</p>}
  </form>;
}
