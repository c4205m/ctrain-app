import { motion } from "framer-motion";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export default function Toggle({ checked, onChange, disabled = false }: ToggleProps) {
  return (
    <motion.button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      animate={{ backgroundColor: checked ? "#f97316" : "#d4d4d8" }}
      transition={{ duration: 0.2 }}
      className="relative shrink-0 w-10 h-6 rounded-full cursor-pointer disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
    >
      <motion.span
        animate={{ x: checked ? 16 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm"
        style={{ willChange: "transform" }}
      />
    </motion.button>
  );
}
