import Link from "next/link";
import type { OpsHomeActionTile } from "@/lib/ops-home-actions";

export function OpsHomeActionTiles({ tiles }: { tiles: OpsHomeActionTile[] }) {
  if (tiles.length === 0) return null;

  return (
    <div className="relative mt-auto w-full pb-2 pt-8">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/90">
        Needs attention
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {tiles.map((tile) => {
          const hot = tile.count > 0;
          return (
            <Link
              key={tile.id}
              href={tile.href}
              className={`flex min-h-[8.5rem] flex-col rounded-2xl border px-3.5 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                hot
                  ? "border-white/70 bg-white text-[var(--harbor-text)]"
                  : "border-white/25 bg-white/15 text-white/85 backdrop-blur-[2px] hover:bg-white/25"
              }`}
            >
              <p
                className={`text-[11px] font-semibold uppercase tracking-wide ${
                  hot ? "text-[var(--harbor-muted)]" : "text-white/75"
                }`}
              >
                {tile.label}
              </p>
              <p
                className={`mt-1.5 font-display text-4xl leading-none tabular-nums tracking-tight ${
                  hot ? "text-[var(--harbor-ink)]" : "text-white"
                }`}
              >
                {tile.count}
              </p>

              <div className="mt-auto pt-3">
                {hot && tile.byProperty.length > 0 ? (
                  <ul className="space-y-1">
                    {tile.byProperty.map((p) => (
                      <li
                        key={`${tile.id}-${p.name}`}
                        className="flex items-baseline justify-between gap-2 text-[11px] leading-tight text-[var(--harbor-muted)]"
                      >
                        <span className="min-w-0 truncate font-medium text-[var(--harbor-text)]/80">
                          {p.name}
                        </span>
                        <span className="shrink-0 tabular-nums font-semibold text-[var(--harbor-ink)]">
                          {p.count}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p
                    className={`text-[11px] ${
                      hot ? "text-[var(--harbor-muted-soft)]" : "text-white/55"
                    }`}
                  >
                    Nothing waiting
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
