/** Barra fina, estilo old money: línea de bronce sobre riel claro. */
export function ProgressBar({ pct }: { pct: number }) {
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div className="h-1 w-full rounded-full bg-line">
      <div className="h-full rounded-full bg-bronze transition-[width] duration-500" style={{ width: `${p}%` }} />
    </div>
  );
}
