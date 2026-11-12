import axios from "axios";

import type { ApiErrorResponse } from "./types";

export class ApiError extends Error {
  readonly status: number;
  readonly details?: ApiErrorResponse;

  constructor(message: string, status: number, details?: ApiErrorResponse) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export function normalizeApiError(error: unknown): ApiError {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const status = error.response?.status ?? 0;
    const details = error.response?.data;

    return new ApiError(
      details?.message ?? error.message ?? "An unexpected API error occurred.",
      status,
      details,
    );
  }

  if (error instanceof Error) {
    return new ApiError(error.message, 0);
  }

  return new ApiError("An unexpected error occurred.", 0);
}
