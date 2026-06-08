import type { InputHTMLAttributes, ReactNode } from "react";

type Size = "sm" | "md" | "lg";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
  label?: string;
  hint?: ReactNode;
  inputSize?: Size;
  wrapperClassName?: string;
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: "px-3 py-2 text-sm",
  md: "px-4 py-3 text-base",
  lg: "px-5 py-4 text-lg",
};

export default function Input({
  icon,
  label,
  hint,
  inputSize = "md",
  wrapperClassName = "",
  className = "",
  ...props
}: InputProps) {
  const input = (
    <div className="relative">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
          {icon}
        </div>
      )}
      <input
        {...props}
        className={`w-full bg-zinc-50 border border-zinc-200 rounded-xl font-body text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent disabled:opacity-50 ${SIZE_CLASSES[inputSize]} ${icon ? "pl-10" : ""} ${className}`}
      />
    </div>
  );

  if (!label) return input;

  return (
    <label className={`flex flex-col gap-1 ${wrapperClassName}`}>
      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
        {label}
        {hint && <span className="normal-case font-normal ml-1">{hint}</span>}
      </span>
      {input}
    </label>
  );
}
