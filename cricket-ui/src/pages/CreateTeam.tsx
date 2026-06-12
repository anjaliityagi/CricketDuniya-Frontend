import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import axios from "axios";

import BackButton from "@/components/BackButton";
import { useCreateTeamMutation } from "@/hooks/useCreateTeamMutation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export default function CreateTeam() {
  const navigate = useNavigate();
  const createTeamMutation = useCreateTeamMutation();

  const [name, setName] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      setError("Please enter team name");
      return;
    }

    try {
      const newTeam = await createTeamMutation.mutateAsync({ name: name.trim() });
      navigate(`/teams/${newTeam.id}`);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? "Could not create team");
        return;
      }
      setError("Could not create team");
    }
  }

  return (
    <div className="max-w-[430px] mx-auto pb-10">
      <BackButton fallbackTo="/teams" label="Back to teams" className="mb-6" />

      <h1 className="text-2xl font-bold mb-1">Create Team</h1>
      <p className="text-muted-foreground text-sm mb-6">Add a new team for your matches</p>

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

            {error && <p className="text-sm font-medium">{error}</p>}

            <Button type="submit" className="w-full h-11" disabled={createTeamMutation.isPending}>
              {createTeamMutation.isPending && (
                <Loader2 className="animate-spin" size={16} />
              )}
              {createTeamMutation.isPending ? "Creating..." : "Create Team"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
