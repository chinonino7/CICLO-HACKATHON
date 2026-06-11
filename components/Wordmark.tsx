export function Wordmark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const cls = size === "lg" ? "text-4xl" : size === "sm" ? "text-xl" : "text-2xl";
  return (
    <span className={`font-display font-semibold tracking-tight text-forest ${cls}`}>
      CICLO
    </span>
  );
}
