import { Suspense } from "react";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="wrap py-20 text-center">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
