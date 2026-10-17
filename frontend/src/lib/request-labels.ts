import type { ChangeRequestStatus } from "@/lib/api";

export const REQUEST_STATUS_LABEL: Record<ChangeRequestStatus, string> = {
  pending: "Waiting for review",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const REQUEST_STATUS_STYLE: Record<ChangeRequestStatus, string> = {
  pending: "border-gold/40 bg-gold-soft text-gold",
  approved: "border-brand/40 bg-brand-soft text-brand-ink",
  rejected: "border-red-300 bg-red-50 text-red-800",
  withdrawn: "border-line bg-bg-alt text-ink-faint",
};

export const REQUEST_KIND_LABEL = { edit: "Edit", delete: "Removal request" } as const;
