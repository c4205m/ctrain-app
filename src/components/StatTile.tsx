interface StatTileProps {
  value?: string | number
  label: string
  hint?: string
  children?: React.ReactNode
  className?: string
  onClick?: () => void
}

function valueSizeCls(value: string | number | undefined): string {
  const len = String(value ?? "").length;
  if (len > 12) return "text-lg";
  if (len > 7) return "text-2xl";
  return "text-4xl";
}

export default function StatTile({ value, label, hint, children, className = "", onClick }: StatTileProps) {
  return (
    <div
      className={`relative bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 flex flex-col items-start gap-1 ${onClick ? "cursor-pointer" : ""} ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      {hint && <span className="absolute top-3 inset-x-0 text-center text-[10px] text-zinc-300">{hint}</span>}
      <div className={`w-full ${hint ? "mt-4" : ""}`}>
        {children ?? <span className={`font-heading font-bold text-orange-500 leading-tight w-full ${valueSizeCls(value)}`}>{value}</span>}
      </div>
      <span className="text-xs text-zinc-500 font-body">{label}</span>
    </div>
  )
}
