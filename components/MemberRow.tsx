import { Avatar } from "./Avatar";

export function MemberRow({
  name,
  index,
  paid,
  turn,
  currentRound,
  started,
  isYou,
}: {
  name: string; // nombre ya resuelto (alias o dirección corta)
  index: number;
  paid: boolean;
  turn: number | null; // ronda en que recibe
  currentRound: number;
  started: boolean;
  isYou?: boolean;
}) {
  const label = isYou ? "Tú" : name;
  const isBeneficiary = started && turn === currentRound;
  let turnLabel = "";
  if (turn !== null && started) {
    if (turn < currentRound) turnLabel = "Ya recibió";
    else if (turn === currentRound) turnLabel = "Recibe esta ronda";
    else turnLabel = `Recibe ronda ${turn + 1}`;
  }

  return (
    <div className="flex items-center justify-between border-b border-line py-3">
      <div className="flex items-center gap-3">
        <span className="w-4 text-xs tabular-nums text-muted">{index + 1}</span>
        <Avatar name={label} />
        <div>
          <p className="text-sm text-ink">
            {label}
            {isBeneficiary && (
              <span className="ml-2 text-[11px] uppercase tracking-widest text-bronze">recibe</span>
            )}
          </p>
          {turnLabel && <p className="text-[11px] text-muted">{turnLabel}</p>}
        </div>
      </div>
      <span className={`inline-flex items-center gap-1.5 text-xs ${paid ? "text-forest" : "text-muted"}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${paid ? "bg-forest" : "bg-line"}`} />
        {paid ? "Pagado" : "Pendiente"}
      </span>
    </div>
  );
}
