import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { addMatch } from "@/data/matchStore";
import type { Match } from "@/data/mockMatches";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export default function CreateMatch() {
  const navigate = useNavigate();

  const [teamOneName, setTeamOneName] = useState("");
  const [teamTwoName, setTeamTwoName] = useState("");
  const [overs, setOvers] = useState("20");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!teamOneName.trim() || !teamTwoName.trim()) {
      setError("Please enter both team names");
      return;
    }

    const oversNumber = Number(overs);
    if (!oversNumber || oversNumber < 1) {
      setError("Overs must be at least 1");
      return;
    }

    const newMatch: Match = {
      id: "match-" + Date.now(),
      status: "scheduled",
      teamOneName: teamOneName.trim(),
      teamTwoName: teamTwoName.trim(),
      teamOneScore: "—",
      teamTwoScore: "—",
      overs_per_side: oversNumber,
      matchNote: `${oversNumber} ov - Add players`,
      teamOnePlayers: [{ id: "host", name: "You", isHost: true }],
      teamTwoPlayers: [],
    };

    addMatch(newMatch);
    navigate(`/matches/${newMatch.id}/setup`);
  }

  return (
    <div className="max-w-[430px] mx-auto pb-10">
      <Link
        to="/matches"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-6"
      >
        <ArrowLeft size={18} />
        Back to matches
      </Link>

      <h1 className="text-2xl font-bold mb-1">Create Match</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Step 1 — enter team names and overs
      </p>

      <Card className="bg-card border-border">
        <CardContent className="p-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-2">Team 1 Name</label>
              <Input
                value={teamOneName}
                onChange={(e) => setTeamOneName(e.target.value)}
                placeholder="e.g. LSG"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Team 2 Name</label>
              <Input
                value={teamTwoName}
                onChange={(e) => setTeamTwoName(e.target.value)}
                placeholder="e.g. SRH"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Overs</label>
              <Input
                type="number"
                value={overs}
                onChange={(e) => setOvers(e.target.value)}
                placeholder="20"
                min={1}
              />
            </div>

            {error && <p className="text-sm font-medium">{error}</p>}

            <Button type="submit" className="w-full h-11">
              Next — Add Players
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
