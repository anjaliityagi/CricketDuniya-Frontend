import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { addTeam } from "@/data/teamStore";
import type { Team } from "@/data/mockTeams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export default function CreateTeam() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [captainName, setCaptainName] = useState("");
  const [city, setCity] = useState("");
  const [playerCount, setPlayerCount] = useState("11");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      setError("Please enter team name");
      return;
    }

    const count = Number(playerCount);
    if (!count || count < 1) {
      setError("Player count must be at least 1");
      return;
    }

    const newTeam: Team = {
      id: "team-" + Date.now(),
      name: name.trim(),
      captainName: captainName.trim() || undefined,
      city: city.trim() || undefined,
      playerCount: count,
    };

    addTeam(newTeam);
    navigate(`/teams/${newTeam.id}`);
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

      <h1 className="text-2xl font-bold mb-1">Create Team</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Add a new team for your matches
      </p>

      <Card className="bg-card border-border">
        <CardContent className="p-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-2">Team Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Lucknow Strikers"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Captain Name (optional)
              </label>
              <Input
                value={captainName}
                onChange={(e) => setCaptainName(e.target.value)}
                placeholder="e.g. Rahul"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">City (optional)</label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Lucknow"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Number of Players</label>
              <Input
                type="number"
                value={playerCount}
                onChange={(e) => setPlayerCount(e.target.value)}
                placeholder="11"
                min={1}
              />
            </div>

            {error && <p className="text-sm font-medium">{error}</p>}

            <Button type="submit" className="w-full h-11">
              Create Team
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
