import { initials } from "@/lib/identity";

export type WheelState = "paid-out" | "current" | "upcoming" | "unknown";
export type WheelMember = { name: string; isYou?: boolean; state: WheelState };

const SIZE = 280;
const CENTER = SIZE / 2;
const RADIUS = 108;
const NODE_R = 16;

/**
 * Visual circular del ciclo: arco de progreso (rondas completadas) y un nodo
 * por miembro en orden de cobro, empezando arriba y girando en sentido horario.
 * Puramente presentacional: funciona igual en modo demo y real.
 */
export function RotationWheel({
  members,
  potLabel,
  subLabel,
  progress,
  legend,
}: {
  members: WheelMember[];
  potLabel: string;
  subLabel: string;
  progress: number; // 0..1, rondas completadas / total
  legend?: string;
}) {
  const n = Math.max(members.length, 1);
  const circumference = 2 * Math.PI * RADIUS;
  const p = Math.max(0, Math.min(1, progress));

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="#E7E4DD" strokeWidth="2" />
          {/* Arco de progreso, desde arriba en sentido horario */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="#B8977E"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - p)}
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
            style={{ transition: "stroke-dashoffset 600ms ease" }}
          />
          {members.map((m, i) => {
            const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
            const x = CENTER + RADIUS * Math.cos(angle);
            const y = CENTER + RADIUS * Math.sin(angle);
            const fill =
              m.state === "paid-out"
                ? "#0A4D3C"
                : m.state === "unknown"
                  ? "#E7E4DD"
                  : "#FAFAFA";
            const text =
              m.state === "paid-out" ? "#FAFAFA" : m.state === "unknown" ? "#6B7B73" : "#B8977E";
            return (
              <g key={i} className={m.state === "current" ? "animate-pulse-soft" : undefined}>
                {m.isYou && (
                  <circle cx={x} cy={y} r={NODE_R + 4} fill="none" stroke="#0A4D3C" strokeWidth="1" />
                )}
                <circle
                  cx={x}
                  cy={y}
                  r={NODE_R}
                  fill={fill}
                  stroke={m.state === "current" ? "#B8977E" : "#E7E4DD"}
                  strokeWidth={m.state === "current" ? 2.5 : 1}
                />
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="11"
                  fontWeight="600"
                  fill={text}
                >
                  {m.state === "unknown" ? "?" : initials(m.name)}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-12 text-center">
          <p className="font-display text-2xl font-semibold leading-tight text-forest">{potLabel}</p>
          <p className="mt-1 text-xs text-muted">{subLabel}</p>
        </div>
      </div>
      {legend && <p className="mt-1 text-xs text-muted">{legend}</p>}
    </div>
  );
}
