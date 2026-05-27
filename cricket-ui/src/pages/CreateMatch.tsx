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

function normalizeTeamName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function getTeamNameKey(value: string) {
  return normalizeTeamName(value).toLowerCase();
}

function toDatetimeLocalValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export default function CreateMatch() {
  const navigate = useNavigate();
  const createMatchMutation = useCreateMatchMutation();

  const [teamAName, setTeamAName] = useState("");
  const [teamBName, setTeamBName] = useState("");
  const [location, setLocation] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [startNow, setStartNow] = useState(false);
  const [overs, setOvers] = useState("20");
  const [error, setError] = useState("");
  const minimumMatchDate = toDatetimeLocalValue(new Date());

  function validateForm() {
    const normalizedTeamAName = normalizeTeamName(teamAName);
    const normalizedTeamBName = normalizeTeamName(teamBName);

    if (!normalizedTeamAName || !normalizedTeamBName) {
      return "Please enter both team names";
    }

    if (getTeamNameKey(teamAName) === getTeamNameKey(teamBName)) {
      return "Please use two different team names";
    }

    if (!location.trim()) {
      return "Please enter match location";
    }

    if (!startNow && !matchDate) {
      return "Please select match date";
    }

    if (!startNow && new Date(matchDate).getTime() < Date.now()) {
      return "Match date and time cannot be before current time";
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
      const normalizedTeamAName = normalizeTeamName(teamAName);
      const normalizedTeamBName = normalizeTeamName(teamBName);

      const newMatch = await createMatchMutation.mutateAsync({
        team_a_name: normalizedTeamAName,
        team_b_name: normalizedTeamBName,
        location: location.trim(),
        match_date: (startNow ? new Date() : new Date(matchDate)).toISOString(),
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
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-sm font-semibold">
                    Match Date
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={startNow}
                      onChange={(e) => {
                        setStartNow(e.target.checked);
                        setError("");
                      }}
                      className="size-4 accent-primary"
                    />
                    Start now
                  </label>
                </div>
                <Input
                  type="datetime-local"
                  value={matchDate}
                  min={minimumMatchDate}
                  onChange={(e) => {
                    setMatchDate(e.target.value);
                    setError("");
                  }}
                  disabled={startNow}
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
