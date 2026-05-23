import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import axios from "axios";

import { useCreateMatchMutation } from "@/hooks/useCreateMatchMutation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string; error?: string }
      | string
      | undefined;

    if (typeof data === "string") return data;
    return data?.message ?? data?.error ?? fallback;
  }

  return fallback;
}

export default function CreateMatch() {
  const navigate = useNavigate();
  const createMatchMutation = useCreateMatchMutation();

  const [teamAName, setTeamAName] = useState("");
  const [teamBName, setTeamBName] = useState("");
  const [location, setLocation] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [overs, setOvers] = useState("20");
  const [error, setError] = useState("");

  function validateForm() {
    if (!teamAName.trim() || !teamBName.trim()) {
      return "Please enter both team names";
    }

    if (teamAName.trim().toLowerCase() === teamBName.trim().toLowerCase()) {
      return "Please use two different team names";
    }

    if (!location.trim()) {
      return "Please enter match location";
    }

    if (!matchDate) {
      return "Please select match date";
    }

    const oversNumber = Number(overs);
    if (!oversNumber || oversNumber < 1) {
      return "Overs must be at least 1";
    }

    return "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");

    try {
      const newMatch = await createMatchMutation.mutateAsync({
        team_a_name: teamAName.trim(),
        team_b_name: teamBName.trim(),
        location: location.trim(),
        match_date: new Date(matchDate).toISOString(),
        overs_per_innings: Number(overs),
      });

      navigate(`/matches/${newMatch.id}/pick-toss`);
    } catch (err) {
      setError(getErrorMessage(err, "Could not create match"));
    }
  }

  const isSubmitting = createMatchMutation.isPending;

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
        Enter team names and match details. Next you will do a toss to decide
        player pick order.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="bg-card border-border">
          <CardContent className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                Team A Name
              </label>
              <Input
                value={teamAName}
                onChange={(e) => {
                  setTeamAName(e.target.value);
                  setError("");
                }}
                placeholder="e.g. Warriors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Team B Name
              </label>
              <Input
                value={teamBName}
                onChange={(e) => {
                  setTeamBName(e.target.value);
                  setError("");
                }}
                placeholder="e.g. Strikers"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Location</label>
              <Input
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setError("");
                }}
                placeholder="e.g. Delhi"
              />
            </div>

            <div className="grid grid-cols-[1fr_96px] gap-3">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Match Date
                </label>
                <Input
                  type="datetime-local"
                  value={matchDate}
                  onChange={(e) => {
                    setMatchDate(e.target.value);
                    setError("");
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Overs</label>
                <Input
                  type="number"
                  value={overs}
                  onChange={(e) => {
                    setOvers(e.target.value);
                    setError("");
                  }}
                  min={1}
                />
              </div>
            </div>

            {error && <p className="text-sm font-medium text-destructive">{error}</p>}

            <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" size={16} />}
              {isSubmitting ? "Creating..." : "Create Match"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
