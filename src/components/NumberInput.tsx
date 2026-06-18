import { useState, type ReactNode } from "react";
import Input from "./Input";

interface NumberInputProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  /** Committed when the field is left empty or invalid (on blur). Default 0; pass undefined for optional fields. */
  emptyValue?: number | undefined;
  /** Round committed values to this many decimal places. Omit for no rounding; 0 forces integers. */
  decimals?: number;
  min?: number;
  max?: number;
  step?: number | string;
  label?: string;
  hint?: ReactNode;
  inputMode?: "numeric" | "decimal";
  placeholder?: string;
  disabled?: boolean;
  wrapperClassName?: string;
  className?: string;
}

export default function NumberInput({
  value,
  onChange,
  emptyValue = 0,
  decimals,
  min,
  max,
  step,
  ...rest
}: NumberInputProps) {
  // Draft text while focused lets the user clear the field (even a lone "0")
  // without it snapping back; the committed numeric value stays in `value`.
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);

  const round = (n: number) => {
    if (decimals == null) return n;
    const f = 10 ** decimals;
    return Math.round(n * f) / f;
  };
  const clamp = (n: number) => {
    let v = n;
    if (min != null) v = Math.max(min, v);
    if (max != null) v = Math.min(max, v);
    return v;
  };

  const display = focused ? text : value == null ? "" : String(value);

  return (
    <Input
      {...rest}
      type="number"
      min={min}
      max={max}
      step={step}
      value={display}
      onFocus={() => {
        setText(value == null ? "" : String(value));
        setFocused(true);
      }}
      onChange={(e) => {
        // Drop leading zeros so "014" can never happen, but keep "0", "0.5".
        const raw = e.target.value.replace(/^0+(?=\d)/, "");
        setText(raw);
        if (raw === "") return; // allow an empty field mid-edit; resolve on blur
        const n = Number(raw);
        if (Number.isFinite(n)) onChange(round(n));
      }}
      onBlur={() => {
        setFocused(false);
        const n = Number(text);
        onChange(text === "" || !Number.isFinite(n) ? emptyValue : clamp(round(n)));
      }}
    />
  );
}
