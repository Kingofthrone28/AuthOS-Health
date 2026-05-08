interface DetailRowProps {
  label: string;
  value?: string | undefined;
  highlight?: boolean | undefined;
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
