import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Copy, Link2, UserPlus } from "lucide-react";

import {
  addPlayerToTeam,
  getMatchById,
  removePlayerFromTeam,
} from "@/data/matchStore";
import { mockPlayers } from "@/data/mockPlayers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ActiveTeam = "one" | "two";

export default function MatchPlayerSetup() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [activeTeam, setActiveTeam] = useState<ActiveTeam>("one");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [copied, setCopied] = useState(false);
  const [match, setMatch] = useState(() => getMatchById(id || ""));

  function refreshMatch() {
    setMatch(getMatchById(id || ""));
  }

  if (!match || !id) {
    return (
      <div className="max-w-[430px] mx-auto text-center py-20">
        <p className="font-semibold mb-2">Match not found</p>
        <Button asChild variant="outline">
          <Link to="/matches">Go back</Link>
        </Button>
      </div>
    );
  }

  const teamOnePlayers = match.teamOnePlayers || [];
  const teamTwoPlayers = match.teamTwoPlayers || [];
  const currentPlayers = activeTeam === "one" ? teamOnePlayers : teamTwoPlayers;

  const addedPlayerIds = [...teamOnePlayers, ...teamTwoPlayers].map((p) => p.id);
  const availablePlayers = mockPlayers.filter((p) => !addedPlayerIds.includes(p.id));

  const inviteLink = `${window.location.origin}/invite/${id}?team=${activeTeam}`;

  function handleAddPlayer() {
    if (!selectedPlayerId) return;

    const player = mockPlayers.find((p) => p.id === selectedPlayerId);
    if (!player) return;

    addPlayerToTeam(id, activeTeam, {
      id: player.id,
      name: player.name,
    });

    setSelectedPlayerId("");
    refreshMatch();
  }

  function handleRemovePlayer(playerId: string) {
    if (playerId === "host") return;
    removePlayerFromTeam(id, activeTeam, playerId);
    refreshMatch();
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function handleContinue() {
    navigate(`/matches/${id}`);
  }

  return (
    <div className="max-w-[430px] mx-auto pb-10">
      <Link
        to="/matches/create"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-6"
      >
        <ArrowLeft size={18} />
        Back
      </Link>

      <h1 className="text-2xl font-bold mb-1">Add Players</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Step 2 — you are host of {match.teamOneName}
      </p>

      <div className="flex justify-center gap-10 mb-8">
        <TeamCircle
          label={match.teamOneName}
          teamNumber={1}
          isActive={activeTeam === "one"}
          isHost
          playerCount={teamOnePlayers.length}
          onClick={() => setActiveTeam("one")}
        />
        <TeamCircle
          label={match.teamTwoName}
          teamNumber={2}
          isActive={activeTeam === "two"}
          playerCount={teamTwoPlayers.length}
          onClick={() => setActiveTeam("two")}
        />
      </div>

      <Card className="bg-card border-border mb-4">
        <CardContent className="p-5 space-y-5">
          <div>
            <p className="text-sm font-semibold mb-2">
              Add player to{" "}
              {activeTeam === "one" ? match.teamOneName : match.teamTwoName}
            </p>

            <div className="flex gap-2">
              <select
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
                className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select existing player</option>
                {availablePlayers.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
              <Button type="button" onClick={handleAddPlayer} disabled={!selectedPlayerId}>
                Add
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Link2 size={16} className="text-muted-foreground" />
              <p className="text-sm font-semibold">Invite new player</p>
            </div>
            <p className="text-xs text-muted-foreground break-all mb-3">{inviteLink}</p>
            <Button type="button" variant="outline" className="w-full gap-2" onClick={handleCopyLink}>
              <Copy size={16} />
              {copied ? "Link copied!" : "Copy invite link"}
            </Button>
          </div>

          <div>
            <p className="text-sm font-semibold mb-3 flex items-center gap-2">
              <UserPlus size={16} />
              Players in squad ({currentPlayers.length})
            </p>

            {currentPlayers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No players added yet</p>
            ) : (
              <div className="space-y-2">
                {currentPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted px-3 py-2"
                  >
                    <div>
                      <p className="font-medium text-sm">{player.name}</p>
                      {player.isHost && (
                        <p className="text-xs text-green-600 font-semibold">Host</p>
                      )}
                    </div>
                    {!player.isHost && (
                      <button
                        type="button"
                        onClick={() => handleRemovePlayer(player.id)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Button className="w-full h-11" onClick={handleContinue}>
        Continue to Match
      </Button>
    </div>
  );
}

type TeamCircleProps = {
  label: string;
  teamNumber: number;
  isActive: boolean;
  isHost?: boolean;
  playerCount: number;
  onClick: () => void;
};

function TeamCircle({
  label,
  teamNumber,
  isActive,
  isHost,
  playerCount,
  onClick,
}: TeamCircleProps) {
  const shortName = label.slice(0, 2).toUpperCase();

  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-2">
      <div
        className={cn(
          "w-20 h-20 rounded-full border-2 flex items-center justify-center text-lg font-bold transition-all",
          isActive
            ? "border-foreground bg-foreground text-background scale-105"
            : "border-border bg-card text-foreground"
        )}
      >
        {shortName}
      </div>
      <p className="text-sm font-semibold">Team {teamNumber}</p>
      <p className="text-xs text-muted-foreground max-w-[90px] truncate">{label}</p>
      {isHost && (
        <span className="text-[10px] font-bold uppercase tracking-wide text-green-600">
          Host
        </span>
      )}
      <span className="text-[10px] text-muted-foreground">{playerCount} players</span>
    </button>
  );
}
