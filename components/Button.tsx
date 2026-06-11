import { ButtonHTMLAttributes } from "react";
import { Spinner } from "./Spinner";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "solid" | "outline";
  full?: boolean;
  loading?: boolean;
};

export function Button({
  variant = "solid",
  full,
  loading,
  className = "",
  children,
  disabled,
  ...rest
}: Props) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3.5 text-sm font-medium tracking-wide transition disabled:opacity-40 active:opacity-80 active:scale-[0.98]";
  const styles =
    variant === "solid"
      ? "bg-forest text-cream"
      : "border border-bronze text-forest bg-transparent";
  return (
    <button
      className={`${base} ${styles} ${full ? "w-full" : ""} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Spinner size={16} />}
      {children}
    </button>
  );
}
