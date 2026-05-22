import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="space-y-8">
      <div>
        <Badge variant="outline" className="mb-4">
          Live Cricket Platform
        </Badge>
        <h1 className="text-3xl font-black leading-tight">
          Manage Your Cricket World Easily
        </h1>
        <p className="text-muted-foreground mt-4 leading-7">
          Create matches with teams, manage live scores, and track
          scores.
        </p>
        <div className="flex flex-col gap-3 mt-6">
          <Button asChild size="lg" className="w-full h-12">
            <Link to="/matches">
              Explore Matches
              <ChevronRight size={20} />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full h-12">
            <Link to="/matches/create">Create Match</Link>
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-border bg-muted px-5 py-8 text-center">
        <p className="font-semibold">No mock matches</p>
        <p className="text-sm text-muted-foreground mt-2">
          Create a match to see real scoring data here.
        </p>
      </div>
    </div>
  );
}
