import axios from "axios";

export function extractApiErrorMessage(err: unknown, fallback = "Something went wrong."): string {
  if (axios.isAxiosError(err)) {
    const serverMsg = (err.response?.data as { message?: string } | undefined)?.message;
    if (typeof serverMsg === "string" && serverMsg.trim()) {
      return serverMsg;
    }
    if (err.message) {
      return err.message;
    }
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}
