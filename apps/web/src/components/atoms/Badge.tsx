import type { AuthorizationCaseStatus } from "@authos/shared-types";

const STATUS_STYLES: Record<AuthorizationCaseStatus, string> = {
  new:                  "bg-blue-100 text-blue-700",
  requirements_found:   "bg-purple-100 text-purple-700",
  docs_missing:         "bg-orange-100 text-orange-700",
  ready_to_submit:      "bg-cyan-100 text-cyan-700",
  submitted:            "bg-blue-100 text-blue-700",
  pending_payer:        "bg-yellow-100 text-yellow-700",
  more_info_requested:  "bg-orange-100 text-orange-700",
  peer_review_needed:   "bg-purple-100 text-purple-700",
  approved:             "bg-green-100 text-green-700",
  denied:               "bg-red-100 text-red-700",
  appealed:             "bg-pink-100 text-pink-700",
  closed:               "bg-gray-100 text-gray-500",
};

const STATUS_LABELS: Record<AuthorizationCaseStatus, string> = {
  new:                  "New",
  requirements_found:   "Reqs Found",
  docs_missing:         "Docs Missing",
  ready_to_submit:      "Ready",
  submitted:            "Submitted",
  pending_payer:        "Pending Payer",
  more_info_requested:  "More Info",
  peer_review_needed:   "Peer Review",
  approved:             "Approved",
  denied:               "Denied",
  appealed:             "Appealed",
  closed:               "Closed",
};

interface BadgeProps {
  status: AuthorizationCaseStatus;
}

export function StatusBadge({ status }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

interface PriorityBadgeProps {
  priority: "standard" | "expedited" | "urgent";
}

const PRIORITY_STYLES: Record<PriorityBadgeProps["priority"], string> = {
  standard:  "bg-gray-100 text-gray-600",
  expedited: "bg-yellow-100 text-yellow-700",
  urgent:    "bg-red-100 text-red-700",
};

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${PRIORITY_STYLES[priority]}`}>
      {priority}
    </span>
  );
}
