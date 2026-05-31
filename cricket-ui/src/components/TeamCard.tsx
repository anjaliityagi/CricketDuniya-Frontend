import { Link } from "react-router-dom";
import { Users, MapPin } from "lucide-react";

import type { Team } from "@/data/mockTeams";
import { Card, CardContent } from "@/components/ui/card";

type TeamCardProps = {
  team: Team;
};

function TeamCard({ team }: TeamCardProps) {
  return (
    <Link to={`/teams/${team.id}`} className="block">
      <Card className="mb-4 rounded-2xl border border-border bg-card py-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.99]">
        <CardContent className="p-5 space-y-3">
          <h3 className="text-xl font-bold leading-tight">{team.name}</h3>

          <div className="text-sm text-muted-foreground space-y-1">
            {team.captainName && (
              <p>
                Captain: <span className="text-foreground font-medium">{team.captainName}</span>
              </p>
            )}
            {team.city && (
              <p className="flex items-center gap-1.5">
                <MapPin size={14} />
                {team.city}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 border-t border-dashed border-border pt-3 text-sm font-bold">
            <Users size={16} className="text-muted-foreground" />
            <span>{team.playerCount} players</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default TeamCard;
