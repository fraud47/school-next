"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { productSales, products } from "@/db/schema";
import { requireAdminSession } from "@/lib/admin";

const methods = ["cash", "bank_transfer", "ecocash", "card", "other"] as const;

function field(data: FormData, name: string) {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function fail(error: string, returnToPayments = false): never {
  redirect(returnToPayments ? `/admin/payments?tab=products&error=${error}` : `/admin/products?error=${error}`);
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function cents(value: string) {
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(amount) ? amount : null;
}

function revalidateCommerce() {
  revalidatePath("/admin/products");
  revalidatePath("/admin/reports");
  revalidatePath("/admin");
}

export async function createProduct(data: FormData) {
  await requireAdminSession();
  const name = field(data, "name");
  const projectName = field(data, "projectName");
  const sku = field(data, "sku");
  const description = field(data, "description");
  const unitPrice = field(data, "unitPrice");
  const stockText = field(data, "stock");
  const priceCents = cents(unitPrice);
  const stock = /^\d+$/.test(stockText) ? Number(stockText) : NaN;
  if (!name || name.length > 120 || !projectName || projectName.length > 100 || sku.length > 80 || description.length > 300 || priceCents === null || priceCents <= 0 || !Number.isSafeInteger(stock) || stock < 0 || stock > 10_000_000) fail("invalid-product");
  try {
    await db.insert(products).values({ name, projectName, sku: sku || null, description: description || null, unitPrice: `${Math.floor(priceCents / 100)}.${String(priceCents % 100).padStart(2, "0")}`, stock });
  } catch {
    if (sku) fail("duplicate-product-sku");
    fail("invalid-product");
  }
  revalidateCommerce();
  redirect("/admin/products?notice=product-created#products");
}

export async function recordProductSale(data: FormData) {
  const session = await requireAdminSession();
  const productIdText = field(data, "productId");
  const quantityText = field(data, "quantity");
  const method = field(data, "method");
  const customer = field(data, "customer");
  const soldAt = field(data, "soldAt");
  const returnToPayments = field(data, "returnTo") === "payments";
  const quantity = /^\d+$/.test(quantityText) ? Number(quantityText) : NaN;
  const productId = /^\d+$/.test(productIdText) ? Number(productIdText) : NaN;
  if (!Number.isSafeInteger(productId) || productId < 1 || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100_000 || !methods.includes(method as typeof methods[number]) || customer.length > 160 || !validDate(soldAt)) fail("invalid-product-sale", returnToPayments);

  const createdBy = Number(session.user.id);
  const reference = `SALE-${soldAt.replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
  try {
    await db.transaction(async (tx) => {
      const [product] = await tx.select().from(products).where(eq(products.id, productId)).for("update").limit(1);
      if (!product || !product.active) fail("product-not-found", returnToPayments);
      if (product.stock < quantity) fail("insufficient-product-stock", returnToPayments);
      const priceCents = cents(product.unitPrice);
      if (priceCents === null || priceCents <= 0 || !Number.isSafeInteger(priceCents * quantity)) fail("invalid-product-sale", returnToPayments);
      const amountCents = priceCents * quantity;
      if (amountCents > 999_999_999_999) fail("invalid-product-sale", returnToPayments);
      await tx.update(products).set({ stock: product.stock - quantity }).where(eq(products.id, productId));
      await tx.insert(productSales).values({
        reference,
        productId,
        productName: product.name,
        projectName: product.projectName,
        quantity,
        unitPrice: product.unitPrice,
        amount: `${Math.floor(amountCents / 100)}.${String(amountCents % 100).padStart(2, "0")}`,
        customer: customer || null,
        method: method as typeof methods[number],
        soldAt,
        createdBy: Number.isSafeInteger(createdBy) && createdBy > 0 ? createdBy : null,
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) throw error;
    throw error;
  }
  revalidateCommerce();
  if (field(data, "returnTo") === "payments") {
    revalidatePath("/admin/payments");
    redirect("/admin/payments?notice=product-sale-recorded&tab=products");
  }
  redirect("/admin/products?notice=product-sale-recorded#sales");
}

export async function restockProduct(data: FormData) {
  await requireAdminSession();
  const productIdText = field(data, "productId");
  const quantityText = field(data, "quantity");
  const productId = /^\d+$/.test(productIdText) ? Number(productIdText) : NaN;
  const quantity = /^\d+$/.test(quantityText) ? Number(quantityText) : NaN;
  if (!Number.isSafeInteger(productId) || productId < 1 || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1_000_000) fail("invalid-stock-adjustment");

  await db.transaction(async (tx) => {
    const [product] = await tx.select({ id: products.id, stock: products.stock }).from(products).where(eq(products.id, productId)).for("update").limit(1);
    if (!product) fail("product-not-found");
    if (product.stock + quantity > 10_000_000) fail("invalid-stock-adjustment");
    await tx.update(products).set({ stock: product.stock + quantity }).where(eq(products.id, productId));
  });
  revalidateCommerce();
  redirect("/admin/products?notice=product-restocked#products");
}
