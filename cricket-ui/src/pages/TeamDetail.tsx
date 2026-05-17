import { Link, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Users, User } from "lucide-react";

import { getTeamById } from "@/data/teamStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function TeamDetail() {
  const { id } = useParams();
  const team = getTeamById(id || "");

  if (!team) {
    return (
      <div className="max-w-[430px] mx-auto text-center py-20">
        <p className="font-semibold mb-2">Team not found</p>
        <Button asChild variant="outline">
          <Link to="/teams">Go back</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-[430px] mx-auto pb-10">
      <Link
        to="/teams"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-6"
      >
        <ArrowLeft size={18} />
        Back to teams
      </Link>

      <Card className="bg-card border-border mb-4">
        <CardContent className="p-5 space-y-5">
          <h1 className="text-2xl font-bold">{team.name}</h1>

          <div className="space-y-3 text-sm">
            {team.captainName && (
              <div className="flex items-center gap-3">
                <User size={18} className="text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">
                    Captain
                  </p>
                  <p className="font-semibold">{team.captainName}</p>
                </div>
              </div>
            )}

            {team.city && (
              <div className="flex items-center gap-3">
                <MapPin size={18} className="text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">
                    City
                  </p>
                  <p className="font-semibold">{team.city}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Users size={18} className="text-muted-foreground" />
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">
                  Players
                </p>
                <p className="font-semibold">{team.playerCount} players</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button className="w-full h-11" disabled>
        Add Players (coming soon)
      </Button>
    </div>
  );
}
