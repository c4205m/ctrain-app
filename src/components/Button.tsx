import { motion } from 'framer-motion'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'info' | 'ghost' | 'text' | 'link'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant: Variant
  size?: Size
  loading?: boolean
  rounded?: boolean
  fullWidth?: boolean
  iconOnly?: boolean
  children: ReactNode
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:   'bg-orange-500 text-white font-semibold',
  secondary: 'bg-orange-50 text-orange-600 font-semibold',
  danger:    'bg-red-50 text-red-600 font-semibold',
  success:   'bg-green-50 text-green-700 font-semibold',
  warning:   'bg-amber-50 text-amber-700 font-semibold',
  info:      'bg-blue-50 text-blue-600 font-semibold',
  ghost:     'bg-transparent text-zinc-600 font-medium',
  text:      'bg-transparent text-zinc-600 font-medium',
  link:      'bg-transparent text-orange-500 font-medium underline underline-offset-2',
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-3 text-sm',
  lg: 'px-6 py-4 text-base',
}

const SIZE_ICON_CLASSES: Record<Size, string> = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
}

export default function Button({
  variant,
  size = 'md',
  loading = false,
  rounded = false,
  fullWidth = false,
  iconOnly = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const shape = iconOnly
    ? `${SIZE_ICON_CLASSES[size]} ${rounded ? 'rounded-full' : 'rounded-xl'}`
    : `${SIZE_CLASSES[size]} ${rounded ? 'rounded-full' : 'rounded-xl'}`

  return (
    <motion.button
      {...(props as object)}
      disabled={disabled || loading}
      whileTap={{ scale: disabled || loading ? 1 : 0.94 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={`cursor-pointer disabled:opacity-40 disabled:pointer-events-none inline-flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:outline-none ${VARIANT_CLASSES[variant]} ${shape} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
      {children}
    </motion.button>
  )
}
