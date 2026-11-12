export interface CreateOrderRequest {
  plan: "starter" | "pro" | "enterprise";
}

export interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
}

export interface VerifyPaymentRequest {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message: string;
  subscription: {
    status: string;
    plan: string;
    startDate: string;
  };
}

export interface SubscriptionInfo {
  status: "free" | "active";
  plan: string;
  startDate?: string;
}
