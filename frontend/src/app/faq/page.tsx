import type { Metadata } from "next";
import { Suspense } from "react";
import FaqContent from "@/components/faq/FaqContent";

export const metadata: Metadata = { title: "FAQ — SUNLINE" };

export default function FaqPage() {
  return (
    <Suspense fallback={null}>
      <FaqContent />
    </Suspense>
  );
}