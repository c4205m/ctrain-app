import { motion } from "framer-motion";
import { Smartphone } from "lucide-react";

export default function MobileGate() {
  return (
    <div className="hidden md:flex fixed inset-0 z-[9999] bg-white flex-col items-center justify-center gap-6 select-none">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="flex flex-col items-center gap-6"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 22, delay: 0.08 }}
          className="w-20 h-20 rounded-3xl bg-orange-50 flex items-center justify-center"
        >
          <Smartphone size={40} className="text-orange-500" strokeWidth={1.5} />
        </motion.div>

        {/* Text */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.4, ease: "easeOut" }}
          className="flex flex-col items-center gap-2 text-center"
        >
          <span className="font-heading font-bold text-3xl text-zinc-900 tracking-tight">
            cTrain
          </span>
          <span className="text-base text-zinc-400 font-medium max-w-xs">
            Open this on your phone.
          </span>
        </motion.div>

        {/* Divider dot */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 500, damping: 25 }}
          className="w-1.5 h-1.5 rounded-full bg-orange-400"
        />
      </motion.div>
    </div>
  );
}
