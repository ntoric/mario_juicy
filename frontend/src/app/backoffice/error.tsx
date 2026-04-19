"use client";

import { useEffect } from "react";
import BackofficeErrorView from "@/components/backoffice/BackofficeErrorView";

export default function BackofficeGlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Backoffice Runtime Error:", error);
  }, [error]);

  return (
    <BackofficeErrorView
      code="500"
      title="System Failure"
      message="An unexpected error occurred on our server. We have been notified and are working to fix it."
      actionText="Try Again"
      onAction={() => reset()}
    />
  );
}
