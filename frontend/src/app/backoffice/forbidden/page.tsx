"use client";

import BackofficeErrorView from "@/components/backoffice/BackofficeErrorView";

export default function ForbiddenPage() {
  return (
    <BackofficeErrorView
      code="403"
      title="Access Denied"
      message="You do not have the necessary permissions to view this resource. Please contact your administrator if you believe this is an error."
      actionText="Back to Dashboard"
      actionHref="/backoffice"
    />
  );
}
