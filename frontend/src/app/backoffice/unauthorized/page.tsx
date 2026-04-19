"use client";

import BackofficeErrorView from "@/components/backoffice/BackofficeErrorView";

export default function UnauthorizedPage() {
  return (
    <BackofficeErrorView
      code="401"
      title="Session Expired"
      message="Your session has expired or you are not authorized to view this page. Please sign in again to continue."
      actionText="Go to Login"
      actionHref="/login"
    />
  );
}
