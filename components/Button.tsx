import { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "solid" | "outline";
  full?: boolean;
};

export function Button({ variant = "solid", full, className = "", ...rest }: Props) {
  const base =
    "rounded-lg px-5 py-3.5 text-sm font-medium tracking-wide transition disabled:opacity-40 active:opacity-80";
  const styles =
    variant === "solid"
      ? "bg-forest text-cream"
      : "border border-bronze text-forest bg-transparent";
  return <button className={`${base} ${styles} ${full ? "w-full" : ""} ${className}`} {...rest} />;
}
