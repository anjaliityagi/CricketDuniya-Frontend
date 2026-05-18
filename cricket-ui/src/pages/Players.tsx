import { mockPlayers } from "@/data/mockPlayers";

export default function Players() {
  return (
    <div className="max-w-[430px] mx-auto space-y-4 pb-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-1">
          Cricket Duniya
        </p>
        <h1 className="text-2xl font-black tracking-tight">Players</h1>
        <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
          Player pool for squads and drafts
        </p>
      </div>

      <ul className="space-y-2">
        {mockPlayers.map((player, index) => (
          <li
            key={player.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-3"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-black text-muted-foreground">
              {index + 1}
            </span>
            <span className="font-semibold">{player.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
