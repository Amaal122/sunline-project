"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getCart, checkout as apiCheckout, ApiError } from "@/lib/api";
import { CartOut } from "@/types/cart";
import { useAppState } from "@/context/AppStateContext";

// ─── Tunisian governorates ────────────────────────────────────────────────────
const GOVERNORATES = [
  "Ariana",
  "Béja",
  "Ben Arous",
  "Bizerte",
  "Gabès",
  "Gafsa",
  "Jendouba",
  "Kairouan",
  "Kasserine",
  "Kébili",
  "Le Kef",
  "Mahdia",
  "Manouba",
  "Médenine",
  "Monastir",
  "Nabeul",
  "Sfax",
  "Sidi Bouzid",
  "Siliana",
  "Sousse",
  "Tataouine",
  "Tozeur",
  "Tunis",
  "Zaghouan",
] as const;

// ─── Zod schema ───────────────────────────────────────────────────────────────
const baseCheckoutSchema = z.object({
  full_name: z
    .string()
    .min(1, "Full name is required")
    .max(255, "Name is too long"),
  email: z
    .string()
    .email("Enter a valid email address")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .regex(
      /^(\+216)?[2459]\d{7}$/,
      "Enter a valid Tunisian phone number (e.g. +21698123456)"
    ),
  address_line: z
    .string()
    .min(1, "Address is required")
    .max(500, "Address is too long"),
  city: z.string().min(1, "City is required").max(100),
  governorate: z.enum(GOVERNORATES, {
    errorMap: () => ({ message: "Select a governorate" }),
  }),
  postal_code: z
    .string()
    .regex(/^\d{4}$/, "Postal code must be 4 digits"),
});

type CheckoutFormData = z.infer<typeof baseCheckoutSchema>;

// ─── Component ────────────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const router = useRouter();
  const { isLoggedIn, refreshCart } = useAppState();

  const [cart, setCart] = useState<CartOut | null>(null);
  const [cartLoading, setCartLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Guests must provide an email (order confirmation has nowhere else
  // to go); logged-in users already have one on file, so it's not
  // asked for or required here.
  const checkoutSchema = useMemo(
    () =>
      baseCheckoutSchema.superRefine((data, ctx) => {
        if (!isLoggedIn && !data.email) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Email is required so we can send your order confirmation",
            path: ["email"],
          });
        }
      }),
    [isLoggedIn]
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
  });
  // Load cart on mount — redirect to /cart if empty
  useEffect(() => {
    getCart()
      .then((data) => {
        if (!data || data.items.length === 0) {
          router.replace("/cart");
        } else {
          setCart(data);
        }
      })
      .catch(() => router.replace("/cart"))
      .finally(() => setCartLoading(false));
  }, [router]);

  async function onSubmit(values: CheckoutFormData) {
    setApiError(null);
    setSubmitting(true);
    try {
      const order = await apiCheckout({
        ...values,
        email: values.email || undefined, // omit rather than send "" — backend expects EmailStr | None
        payment_method: "COD",
      });
      await refreshCart();
      router.push(`/order/${order.order_number}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setApiError(err.message);
      } else {
        setApiError("Something went wrong. Please try again.");
      }
      setSubmitting(false);
    }
  }

  if (cartLoading) {
    return (
      <div className="wrap" style={{ padding: "80px 0", textAlign: "center" }}>
        Loading…
      </div>
    );
  }

  return (
    <div className="wrap" style={{ padding: "48px 0 100px" }}>
      {/* Breadcrumb */}
      <nav style={{ marginBottom: 32, fontSize: 12, color: "var(--ink-dim)" }}>
        <Link href="/cart">Bag</Link>
        <span style={{ margin: "0 8px" }}>›</span>
        <span style={{ color: "var(--ink)", fontWeight: 600 }}>Checkout</span>
      </nav>

      <h1 style={{ marginBottom: 40 }}>Checkout</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 380px",
          gap: 60,
          alignItems: "start",
        }}
      >
        {/* ── LEFT: Form ─────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* API-level error banner */}
          {apiError && (
            <div
              role="alert"
              style={{
                background: "#fdf0f0",
                border: "1px solid #e8c0c0",
                borderRadius: "var(--radius)",
                color: "#7a2828",
                fontSize: 13.5,
                marginBottom: 28,
                padding: "14px 18px",
              }}
            >
              {apiError}
            </div>
          )}

          {/* Contact Info */}
          <section style={{ marginBottom: 36 }}>
            <p
              className="eyebrow"
              style={{ marginBottom: 20, borderBottom: "1px solid var(--ink-faint)", paddingBottom: 10 }}
            >
              Contact Information
            </p>
            <div style={{ display: "grid", gap: 18 }}>
              <Field
                label="Full Name"
                id="full_name"
                error={errors.full_name?.message}
              >
                <input
                  id="full_name"
                  {...register("full_name")}
                  className="form-input"
                  placeholder="Amira Ben Ali"
                  autoComplete="name"
                />
              </Field>
              {!isLoggedIn && (
                <Field label="Email" id="email" error={errors.email?.message}>
                  <input
                    id="email"
                    {...register("email")}
                    className="form-input"
                    placeholder="you@email.com"
                    autoComplete="email"
                    type="email"
                  />
                </Field>
              )}
              <Field
                label="Phone Number"
                id="phone"
                error={errors.phone?.message}
              >
                <input
                  id="phone"
                  {...register("phone")}
                  className="form-input"
                  placeholder="+21698123456"
                  autoComplete="tel"
                  type="tel"
                />
              </Field>
            </div>
          </section>

          {/* Shipping Address */}
          <section style={{ marginBottom: 36 }}>
            <p
              className="eyebrow"
              style={{ marginBottom: 20, borderBottom: "1px solid var(--ink-faint)", paddingBottom: 10 }}
            >
              Shipping Address
            </p>
            <div style={{ display: "grid", gap: 18 }}>
              <Field
                label="Address"
                id="address_line"
                error={errors.address_line?.message}
              >
                <input
                  id="address_line"
                  {...register("address_line")}
                  className="form-input"
                  placeholder="12 Rue de la Liberté, Apt 3"
                  autoComplete="street-address"
                />
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="City" id="city" error={errors.city?.message}>
                  <input
                    id="city"
                    {...register("city")}
                    className="form-input"
                    placeholder="Tunis"
                    autoComplete="address-level2"
                  />
                </Field>

                <Field
                  label="Postal Code"
                  id="postal_code"
                  error={errors.postal_code?.message}
                >
                  <input
                    id="postal_code"
                    {...register("postal_code")}
                    className="form-input"
                    placeholder="1000"
                    autoComplete="postal-code"
                    maxLength={4}
                  />
                </Field>
              </div>

              <Field
                label="Governorate"
                id="governorate"
                error={errors.governorate?.message}
              >
                <select
                  id="governorate"
                  {...register("governorate")}
                  className="form-input form-select"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select governorate
                  </option>
                  {GOVERNORATES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          {/* Payment Method — COD only for now */}
          <section style={{ marginBottom: 40 }}>
            <p
              className="eyebrow"
              style={{ marginBottom: 20, borderBottom: "1px solid var(--ink-faint)", paddingBottom: 10 }}
            >
              Payment Method
            </p>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "16px 18px",
                border: "2px solid var(--ink)",
                borderRadius: "var(--radius)",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <input
                type="radio"
                name="payment_method_display"
                defaultChecked
                readOnly
                style={{ accentColor: "var(--ink)", width: 16, height: 16 }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  Cash on Delivery
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 2 }}>
                  Pay when your order arrives
                </div>
              </div>
            </label>
          </section>

          <button
            type="submit"
            className="btn btn-dark btn-block"
            disabled={submitting}
            style={{ fontSize: 13, padding: "18px 0", opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? "Placing order…" : "Place Order"}
          </button>
        </form>

        {/* ── RIGHT: Order Summary ────────────────────────────────────────── */}
        <aside>
          <div
            style={{
              background: "var(--gray)",
              borderRadius: "var(--radius)",
              padding: 28,
              position: "sticky",
              top: 120,
            }}
          >
            <p
              className="eyebrow"
              style={{ marginBottom: 20 }}
            >
              Order Summary
            </p>

            {cart && (
              <>
                {/* Items */}
                <div style={{ marginBottom: 20 }}>
                  {cart.items.map((item) => (
                    <div
                      key={item.product_variant_id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 12,
                        paddingBottom: 14,
                        marginBottom: 14,
                        borderBottom: "1px solid var(--ink-faint)",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, fontSize: 13.5 }}>
                          {item.product.name}
                        </div>
                        <div style={{ fontSize: 11.5, color: "var(--ink-dim)", marginTop: 2 }}>
                          {item.variant.color} / {item.variant.size} × {item.quantity}
                        </div>
                      </div>
                      <span style={{ fontSize: 13.5, whiteSpace: "nowrap" }}>
                        {item.line_total} DT
                      </span>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 13.5 }}>
                  <span style={{ color: "var(--ink-dim)" }}>Subtotal</span>
                  <span>{cart.subtotal} DT</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, fontSize: 13.5 }}>
                  <span style={{ color: "var(--ink-dim)" }}>Delivery</span>
                  <span>
                    {Number(cart.delivery_fee) === 0 ? "Free" : `${cart.delivery_fee} DT`}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontWeight: 700,
                    fontSize: 16,
                    borderTop: "1px solid var(--ink-faint)",
                    paddingTop: 14,
                  }}
                >
                  <span>Total</span>
                  <span>{cart.total} DT</span>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

// ─── Small helper ─────────────────────────────────────────────────────────────

function Field({
  label,
  id,
  error,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        style={{
          display: "block",
          fontSize: 11.5,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 7,
          color: error ? "#7a2828" : "var(--ink)",
        }}
      >
        {label}
      </label>
      {children}
      {error && (
        <p
          role="alert"
          style={{ fontSize: 12, color: "#7a2828", marginTop: 5 }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
