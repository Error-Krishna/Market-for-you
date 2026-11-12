import { apiClient } from "@/lib/api/client";
import type {
  CreateOrderRequest,
  CreateOrderResponse,
  VerifyPaymentRequest,
  VerifyPaymentResponse,
} from "../types/billing.types";

const BASE = "/v1/payments";

export async function createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
  const res = await apiClient.post<CreateOrderResponse>(`${BASE}/payment/create-order`, request);
  return res.data;
}

export async function verifyPayment(request: VerifyPaymentRequest): Promise<VerifyPaymentResponse> {
  const res = await apiClient.post<VerifyPaymentResponse>(`${BASE}/payment/verify`, request);
  return res.data;
}
