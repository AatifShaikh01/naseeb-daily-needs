import { z } from "zod";

/** Product add/edit form ke liye. */
export const productSchema = z.object({
  name: z.string().trim().min(1, "Enter the product name").max(60),
  size: z.string().trim().min(1, "Enter the size").max(30),
  defaultRatePerBox: z
    .union([z.null(), z.coerce.number().min(0, "Rate cannot be negative").max(1000000)])
    .optional(),
  isActive: z.boolean(),
});

/** Staff add form ke liye (Settings). */
export const staffSchema = z.object({
  name: z.string().trim().min(1, "Enter the staff name").max(60),
});

/** Stock In — multi-row batch (Stock In form me ek se zyada products). */
export const stockBatchSchema = z.object({
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  note: z.union([z.literal(""), z.string().trim().max(200)]).nullable().optional(),
  entries: z
    .array(
      z.object({
        productId: z.coerce.number().int().positive("Select a product in every row"),
        boxes: z.coerce.number().int().min(1, "At least 1 box in every row").max(100000),
      }),
    )
    .min(1, "Add at least one product")
    .max(100, "Max 100 rows at a time"),
});

/** Stock In — single entry. */
export const stockEntrySchema = z.object({
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  productId: z.coerce.number().int().positive("Select a product"),
  boxes: z.coerce.number().int().min(1, "At least 1 box").max(100000),
  note: z.union([z.literal(""), z.string().trim().max(200)]).nullable().optional(),
});

export type ProductInput = z.infer<typeof productSchema>;

/** Sale — single item line. */
export const saleItemSchema = z.object({
  productId: z.coerce.number().int().positive("Select a product for each row"),
  boxes: z.coerce.number().int().min(1, "At least 1 box").max(100000),
  ratePerBox: z.coerce.number().min(0, "Rate cannot be negative").max(1000000),
});

/** Sale create form ke liye. */
export const saleSchema = z.object({
  saleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  customerName: z.string().trim().min(1, "Enter the customer name").max(100),
  customerPhone: z
    .union([z.literal(""), z.string().trim().regex(/^[0-9+\-\s]{6,15}$/, "Enter a valid phone number")])
    .nullable()
    .optional(),
  deliveredBy: z.coerce.number().int().positive("Select who delivered"),
  paymentStatus: z.enum(["paid", "pending", "partial"]),
  paidAmount: z.coerce.number().min(0, "Amount cannot be negative").max(100000000),
  paymentMode: z.enum(["cash", "upi", "bank"]).optional().default("cash"),
  note: z.union([z.literal(""), z.string().trim().max(300)]).nullable().optional(),
  items: z.array(saleItemSchema).min(1, "Add at least one product").max(100, "Max 100 rows"),
});

/** Sale edit form ke liye (same fields). */
export type SaleInput = z.infer<typeof saleSchema>;

/** Sale-level payment. */
export const salePaymentSchema = z.object({
  saleId: z.coerce.number().int().positive("Sale not found"),
  amount: z.coerce.number().positive("Enter an amount").max(100000000),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  mode: z.enum(["cash", "upi", "bank"]),
});

/** Customer-level payment (FIFO across that customer's sales). */
export const customerPaymentSchema = z.object({
  customerName: z.string().trim().min(1, "Customer name required"),
  customerPhone: z
    .union([z.literal(""), z.string().trim().regex(/^[0-9+\-\s]{6,15}$/, "Enter a valid phone number")])
    .nullable()
    .optional(),
  amount: z.coerce.number().positive("Enter an amount").max(100000000),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  mode: z.enum(["cash", "upi", "bank"]),
  note: z.union([z.literal(""), z.string().trim().max(200)]).nullable().optional(),
});


/** Supplier form ke liye. */
export const supplierSchema = z.object({
  name: z.string().trim().min(1, "Enter the supplier name").max(100),
  phone: z
    .union([z.literal(""), z.string().trim().regex(/^[0-9+\-\s]{6,15}$/, "Enter a valid phone number")])
    .nullable()
    .optional(),
});

/** Purchase item line. */
export const purchaseItemSchema = z.object({
  productId: z.coerce.number().int().positive("Select a product for each row"),
  boxes: z.coerce.number().int().min(1, "At least 1 box").max(100000),
  ratePerBox: z.coerce.number().min(0, "Rate cannot be negative").max(1000000),
});

/** Purchase create form ke liye. */
export const purchaseSchema = z.object({
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  supplierId: z.coerce.number().int().positive("Select a supplier"),
  direction: z.enum(["in", "return"]),
  paymentStatus: z.enum(["paid", "pending", "partial"]),
  paidAmount: z.coerce.number().min(0, "Amount cannot be negative").max(100000000),
  note: z.union([z.literal(""), z.string().trim().max(300)]).nullable().optional(),
  items: z.array(purchaseItemSchema).min(1, "Add at least one product").max(100, "Max 100 rows"),
});

/** Supplier-level payment. */
export const supplierPaymentSchema = z.object({
  supplierId: z.coerce.number().int().positive("Supplier not found"),
  amount: z.coerce.number().positive("Enter an amount").max(100000000),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  mode: z.enum(["cash", "upi", "bank"]),
  note: z.union([z.literal(""), z.string().trim().max(200)]).nullable().optional(),
});


/** Zod error se pehla message nikaalo (UI me dikhane ke liye). */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input — please check again.";
}
