export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface ApiErrorResponse {
  success?: boolean;
  code?: string;
  message?: string;
  error?: string;
}
