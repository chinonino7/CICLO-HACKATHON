import { initials } from "@/lib/identity";

export function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-bronze/15 font-medium text-bronze"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  );
}
