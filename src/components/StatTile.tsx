interface StatTileProps {
  value?: string | number
  label: string
  children?: React.ReactNode
  className?: string
}

function valueSizeCls(value: string | number | undefined): string {
  const len = String(value ?? "").length;
  if (len > 12) return "text-lg";
  if (len > 7) return "text-2xl";
  return "text-4xl";
}

export default function StatTile({ value, label, children, className = "" }: StatTileProps) {
  return (
    <div className={`bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 flex flex-col items-start gap-1 ${className}`}>
      {children ?? <span className={`font-heading font-bold text-orange-500 leading-tight w-full ${valueSizeCls(value)}`}>{value}</span>}
      <span className="text-xs text-zinc-500 font-body">{label}</span>
    </div>
  )
}
