import type { LucideIcon } from 'lucide-react'
import Button from './Button'

interface EmptyStateProps {
  icon: LucideIcon
  heading: string
  subtext: string
  ctaLabel?: string
  onCta?: () => void
}

export default function EmptyState({ icon: Icon, heading, subtext, ctaLabel, onCta }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 px-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center">
        <Icon size={32} className="text-orange-400" />
      </div>
      <div className="space-y-1">
        <h3 className="font-heading font-semibold text-lg text-zinc-900">{heading}</h3>
        <p className="text-sm text-zinc-500 font-body leading-relaxed">{subtext}</p>
      </div>
      {ctaLabel && onCta && (
        <Button variant="primary" onClick={onCta}>{ctaLabel}</Button>
      )}
    </div>
  )
}
