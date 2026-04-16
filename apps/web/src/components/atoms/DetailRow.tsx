interface DetailRowProps {
  label: string;
  value?: string;
  highlight?: boolean;
}

export function DetailRow({ label, value, highlight }: DetailRowProps) {
  if (!value) return null;
  return (
    <>
      <dt className="text-gray-400">{label}</dt>
      <dd className={highlight ? "font-semibold text-green-700" : "text-gray-700"}>{value}</dd>
    </>
  );
}
