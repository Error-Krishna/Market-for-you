import { QueryProvider } from "@/app/providers/QueryProvider";
import { AuthProvider } from "@/features/auth";
import { ThemeProvider } from "@/features/theme";
import { RouterProvider } from "react-router-dom";
import { router } from "@/app/router";
import "@/styles/globals.css";

export default function App() {
  return (
    <QueryProvider>
      <ThemeProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}
