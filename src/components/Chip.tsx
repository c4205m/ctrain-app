type Variant = 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'info' | 'outline' | 'disabled' | 'custom'
type Size = 'sm' | 'md' | 'lg'

interface ChipProps {
  children?: React.ReactNode
  variant: Variant
  size?: Size
  customClass?: string
  style?: React.CSSProperties
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:   'bg-orange-50 text-orange-600 border-orange-50',
  secondary: 'bg-zinc-50 text-zinc-600 border-zinc-100',
  danger:    'bg-red-50 text-red-600 border-red-100',
  success:   'bg-green-50 text-green-700 border-green-100',
  warning:   'bg-amber-50 text-amber-700 border-amber-100',
  info:      'bg-blue-50 text-blue-600 border-blue-100',
  outline:   'bg-transparent text-zinc-600 border-zinc-400',
  disabled:  'bg-zinc-50 text-zinc-400 border-zinc-200',
  custom:    '',
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'text-[10px] px-1.5 py-0',
  md: 'text-xs px-2 py-0.5',
  lg: 'text-sm px-3 py-1',
}

export default function Chip({ children, variant, size = 'md', customClass = '', style }: ChipProps) {
  const cls = variant === 'custom' ? customClass : VARIANT_CLASSES[variant]
  return (
    <span
      className={`font-medium shrink-0 rounded-full border ${SIZE_CLASSES[size]} ${cls}`}
      style={style}
    >
      {children}
    </span>
  )
}
