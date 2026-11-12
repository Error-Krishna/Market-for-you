import { QueryProvider } from "@/app/providers/QueryProvider";
import { AuthProvider } from "@/features/auth";
import { RouterProvider } from "react-router-dom";
import { router } from "@/app/router";
import "@/styles/globals.css";

export default function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryProvider>
  );
}
