import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  iconColor?: string;
}

export function KpiCard({ label, value, icon: Icon, iconColor = "text-blue-500" }: KpiCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 px-5 py-4 flex items-center gap-4 min-w-[130px]">
      <div className={`${iconColor} shrink-0`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800 leading-none">{value}</p>
        <p className="text-xs text-gray-500 mt-1">{label}</p>
      </div>
    </div>
  );
}
