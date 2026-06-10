export function Wordmark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const cls = size === "lg" ? "text-5xl" : size === "sm" ? "text-xl" : "text-3xl";
  return (
    <span className={`font-serif font-semibold tracking-[0.18em] text-forest ${cls}`}>
      CICLO
    </span>
  );
}
