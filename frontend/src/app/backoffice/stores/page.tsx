"use client";

import BackofficeLayout from "@/components/backoffice/BackofficeLayout";
import StoreManager from "@/components/backoffice/stores/StoreManager";

export default function StoresPage() {
  return (
    <BackofficeLayout>
      <StoreManager />
    </BackofficeLayout>
  );
}
