// lib/registration/payment-types.ts
// API response shapes and the checkout-order guard for the payment flow.

export interface SaveRegistrationResponse {
    error?: string;
    id?: string;
    amount_paid_paise?: number;
    amount_due_paise?: number;
    total_cost_paise?: number;
    payment_status?: string;
}

/** Raw body of POST /api/payments/create-order. */
export interface OrderApiResponse {
    error?: string;
    configured?: boolean;
    skipCheckout?: boolean;
    orderId?: string;
    amount?: number;
    currency?: string;
    keyId?: string;
    name?: string;
    email?: string;
    contact?: string;
    registration_code?: string | null;
    amount_paid_paise?: number;
}

export interface VerifyResponse {
    error?: string;
    amount_paid_paise?: number;
    amount_due_paise?: number;
    payment_status?: string;
    registration_code?: string | null;
}

/** Fully validated order handed to Razorpay Checkout. */
export interface CheckoutOrderPayload {
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
    name: string;
    email: string;
    contact: string;
}

/**
 * Turns a raw order response into a checkout payload. Returns null when the
 * required fields (order id, amount, key id) are missing, so Razorpay is never
 * opened with incomplete data.
 */
export function toCheckoutOrder(
    response: OrderApiResponse,
    fallback: { name: string; email: string; contact: string }
): CheckoutOrderPayload | null {
    if (!response.orderId || typeof response.amount !== 'number' || !response.keyId) return null;
    return {
        orderId: response.orderId,
        amount: response.amount,
        currency: response.currency || 'INR',
        keyId: response.keyId,
        name: response.name || fallback.name,
        email: response.email || fallback.email,
        contact: response.contact || fallback.contact,
    };
}