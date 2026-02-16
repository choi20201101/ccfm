interface StatusBadgeProps {
  status: "online" | "offline" | "warning" | "error";
  label: string;
}

const COLORS = {
  online: "bg-green-100 text-green-800",
  offline: "bg-gray-100 text-gray-600",
  warning: "bg-yellow-100 text-yellow-800",
  error: "bg-red-100 text-red-800",
};

const DOT_COLORS = {
  online: "bg-green-500",
  offline: "bg-gray-400",
  warning: "bg-yellow-500",
  error: "bg-red-500",
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${COLORS[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_COLORS[status]}`} />
      {label}
    </span>
  );
}
