"use client";

import BackofficeErrorView from "@/components/backoffice/BackofficeErrorView";

export default function BackofficeNotFound() {
  return (
    <BackofficeErrorView
      code="404"
      title="Page Not Found"
      message="The page you are looking for might have been removed, had its name changed, or is temporarily unavailable."
      actionText="Back to Dashboard"
      actionHref="/backoffice"
    />
  );
}
