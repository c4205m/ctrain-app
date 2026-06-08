import { motion } from "framer-motion";

type Variant = "default";

interface SegmentedControlProps<T extends string> {
  options: T[];
  selected: T;
  onChange: (selected: T) => void;
  variant?: Variant;
  disabled?: boolean;
}

const WRAPPER_CLASSES: Record<Variant, string> = {
  default: "flex bg-zinc-100 rounded-xl p-1 gap-1",
};

const BUTTON_BASE: Record<Variant, string> = {
  default: "flex-1 py-1.5 text-xs font-medium rounded-lg capitalize cursor-pointer",
};

const ACTIVE_CLASSES: Record<Variant, string> = {
  default: "bg-white text-zinc-900 shadow-sm",
};

const INACTIVE_CLASSES: Record<Variant, string> = {
  default: "text-zinc-500",
};

export default function SegmentedControl<T extends string>({
  options,
  selected,
  onChange,
  variant = "default",
  disabled = false,
}: SegmentedControlProps<T>) {
  return (
    <div className={WRAPPER_CLASSES[variant]}>
      {options.map((opt) => {
        const isActive = selected === opt;
        const isLocked = disabled && !isActive;
        return (
          <motion.button
            key={opt}
            type="button"
            onClick={() => !isLocked && onChange(opt)}
            whileTap={isLocked ? undefined : { scale: 0.94 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            style={{ willChange: "transform" }}
            className={`${BUTTON_BASE[variant]} ${isActive ? ACTIVE_CLASSES[variant] : INACTIVE_CLASSES[variant]} ${isLocked ? "opacity-30 cursor-not-allowed" : ""}`}
          >
            {opt}
          </motion.button>
        );
      })}
    </div>
  );
}
