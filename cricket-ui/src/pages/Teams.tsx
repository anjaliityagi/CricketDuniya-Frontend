import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

import { getTeams } from "@/data/teamStore";
import TeamCard from "@/components/TeamCard";
import { Button } from "@/components/ui/button";

export default function Teams() {
  const allTeams = getTeams();

  return (
    <div className="max-w-[430px] mx-auto min-h-[85vh] pb-28">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-2">
          Cricket Duniya
        </p>
        <h1 className="text-3xl font-black tracking-tight">Teams</h1>
        <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
          Manage your cricket teams
        </p>
      </div>

      <div className="rounded-xl border border-border bg-muted px-4 py-3 mb-6 text-center">
        <p className="text-2xl font-black">{allTeams.length}</p>
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mt-1">
          Total Teams
        </p>
      </div>

      {allTeams.length > 0 ? (
        <div>
          {allTeams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 px-6 rounded-2xl border border-dashed border-border bg-muted">
          <p className="font-semibold">No teams yet</p>
          <p className="text-muted-foreground text-sm mt-2">
            Create your first team to get started
          </p>
        </div>
      )}

      <div className="pointer-events-none fixed left-1/2 z-[34] w-full max-w-[430px] -translate-x-1/2 bg-gradient-to-t from-background via-background to-transparent px-4 pt-10 [bottom:calc(3.85rem+env(safe-area-inset-bottom,0px))] pb-2">
        <Button asChild className="pointer-events-auto w-full h-12 rounded-2xl text-base font-bold shadow-xl gap-2">
          <Link to="/teams/create">
            <Plus size={20} strokeWidth={2.5} />
            Create Team
          </Link>
        </Button>
      </div>
    </div>
  );
}
