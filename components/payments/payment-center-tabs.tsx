"use client";

import type { ReactNode } from "react";
import { Bus, CreditCard, Package } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function PaymentCenterTabs({
  defaultTab,
  invoices,
  products,
  activities,
}: {
  defaultTab: string;
  invoices: ReactNode;
  products: ReactNode;
  activities: ReactNode;
}) {
  const selected = ["products", "activities"].includes(defaultTab) ? defaultTab : "invoices";
  return (
    <Tabs defaultValue={selected} className="gap-4">
      <TabsList variant="line" className="flex h-auto w-full justify-start gap-2 overflow-x-auto rounded-none border-b border-slate-200 p-0">
        <TabsTrigger value="invoices" className="flex-none gap-2 px-4 py-3 text-xs data-active:text-indigo-700"><CreditCard className="size-4" />Invoice payments</TabsTrigger>
        <TabsTrigger value="products" className="flex-none gap-2 px-4 py-3 text-xs data-active:text-indigo-700"><Package className="size-4" />Product sales</TabsTrigger>
        <TabsTrigger value="activities" className="flex-none gap-2 px-4 py-3 text-xs data-active:text-indigo-700"><Bus className="size-4" />Student activities</TabsTrigger>
      </TabsList>
      <TabsContent value="invoices" className="mt-0 space-y-5">{invoices}</TabsContent>
      <TabsContent value="products" className="mt-0 space-y-5">{products}</TabsContent>
      <TabsContent value="activities" className="mt-0 space-y-5">{activities}</TabsContent>
    </Tabs>
  );
}
