import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMatchQuery } from "@/hooks/useMatchQuery";
import { useMatchSquadQuery } from "@/hooks/useMatchSquadQuery";
import { updateMatchLineup, type MatchSquadPlayer } from "@/services/matches";
import { cn } from "@/lib/utils";

type EditableSquadPlayer = MatchSquadPlayer & {
  selected: boolean;
  order: string;
};

function getPlayerLabel(player: MatchSquadPlayer) {
  return player.player_name || player.name || player.phone_number || "Unnamed player";
}

export default function MatchPlayerSetup() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: match, isLoading: isLoadingMatch } = useMatchQuery(id);
  const {
    data: squad = [],
    isLoading: isLoadingSquad,
    refetch,
  } = useMatchSquadQuery(id);
  const [players, setPlayers] = useState<EditableSquadPlayer[]>([]);
  const [activeTeamId, setActiveTeamId] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const teamsWithPlayingXi = new Set(
      squad
        .filter((player) => player.is_playing_xi)
        .map((player) => player.match_team_id)
    );

    setPlayers(
      squad.map((player) => ({
        ...player,
        selected: player.is_playing_xi || !teamsWithPlayingXi.has(player.match_team_id),
        order: player.batting_order ? String(player.batting_order) : "",
      }))
    );
  }, [squad]);

  useEffect(() => {
    if (match?.team_a_match_team_id && !activeTeamId) {
      setActiveTeamId(match.team_a_match_team_id);
    }
  }, [activeTeamId, match?.team_a_match_team_id]);

  const teamTabs = useMemo(() => {
    if (!match) return [];
    return [
      { id: match.team_a_match_team_id, name: match.teamOneName },
      { id: match.team_b_match_team_id, name: match.teamTwoName },
    ].filter((team): team is { id: string; name: string } => Boolean(team.id));
  }, [match]);

  const activePlayers = players.filter((player) => player.match_team_id === activeTeamId);

  function updatePlayer(
    playerId: string,
    patch: Partial<Pick<EditableSquadPlayer, "selected" | "is_captain" | "is_wicket_keeper" | "order">>
  ) {
    setPlayers((current) =>
      current.map((player) =>
        player.match_team_player_id === playerId ? { ...player, ...patch } : player
      )
    );
  }

  async function handleSave() {
    if (!id) return;

    setError("");
    setIsSaving(true);

    try {
      await updateMatchLineup(
        id,
        players.map((player) => ({
          match_team_player_id: player.match_team_player_id,
          is_playing_xi: player.selected,
          is_captain: player.is_captain,
          is_wicket_keeper: player.is_wicket_keeper,
          batting_order: player.order ? Number(player.order) : null,
        }))
      );
      await refetch();
      navigate(`/matches/${id}`);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? "Could not save lineup");
      } else {
        setError("Could not save lineup");
      }
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoadingMatch || isLoadingSquad) {
    return (
      <div className="max-w-[430px] mx-auto flex items-center justify-center gap-2 py-20 text-muted-foreground">
        <Loader2 className="animate-spin" size={20} />
        <span className="text-sm font-medium">Loading squad</span>
      </div>
    );
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

  return (
    <div className="max-w-[430px] mx-auto pb-10">
      <Link
        to={`/matches/${id}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-6"
      >
        <ArrowLeft size={18} />
        Back
      </Link>

      <h1 className="text-2xl font-bold mb-1">Match Lineup</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Select playing XI, captain, keeper and batting order
      </p>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {teamTabs.map((team) => (
          <Button
            key={team.id}
            type="button"
            variant={activeTeamId === team.id ? "default" : "outline"}
            onClick={() => setActiveTeamId(team.id)}
            className="h-10"
          >
            <span className="truncate">{team.name}</span>
          </Button>
        ))}
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-4 space-y-3">
          {activePlayers.length > 0 ? (
            activePlayers.map((player) => (
              <div
                key={player.match_team_player_id}
                className={cn(
                  "rounded-xl border border-border bg-muted px-3 py-3 space-y-3",
                  player.selected && "border-primary/40 bg-primary/10"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {getPlayerLabel(player)}
                    </p>
                    {player.phone_number && (
                      <p className="text-xs text-muted-foreground">
                        {player.phone_number}
                      </p>
                    )}
                  </div>
                  <label className="flex items-center gap-2 text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={player.selected}
                      onChange={(event) =>
                        updatePlayer(player.match_team_player_id, {
                          selected: event.target.checked,
                        })
                      }
                    />
                    XI
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={player.is_captain}
                      onChange={(event) =>
                        updatePlayer(player.match_team_player_id, {
                          is_captain: event.target.checked,
                        })
                      }
                    />
                    Captain
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={player.is_wicket_keeper}
                      onChange={(event) =>
                        updatePlayer(player.match_team_player_id, {
                          is_wicket_keeper: event.target.checked,
                        })
                      }
                    />
                    WK
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={player.order}
                    onChange={(event) =>
                      updatePlayer(player.match_team_player_id, {
                        order: event.target.value,
                      })
                    }
                    placeholder="Order"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No players found for this match team. Add players to the team first.
            </p>
          )}
        </CardContent>
      </Card>

      {error && <p className="text-sm font-medium text-destructive mt-4">{error}</p>}

      <Button
        type="button"
        className="w-full h-11 mt-5 gap-2"
        disabled={isSaving || players.length === 0}
        onClick={handleSave}
      >
        {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
        {isSaving ? "Saving..." : "Save Lineup"}
      </Button>
    </div>
  );
}
