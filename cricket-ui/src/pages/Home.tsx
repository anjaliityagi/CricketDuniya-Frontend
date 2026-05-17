import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
          Create teams, organize tournaments, manage live matches, and track
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
            <Link to="/teams">Create Team</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Live Match</p>
              <CardTitle className="text-xl mt-1">India vs Australia</CardTitle>
            </div>
            <Badge>LIVE</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 items-center text-center">
            <div>
              <p className="font-bold">IND</p>
              <p className="text-2xl font-black mt-2">186/4</p>
            </div>
            <p className="font-black text-muted-foreground">VS</p>
            <div>
              <p className="font-bold">AUS</p>
              <p className="text-muted-foreground font-semibold mt-2 text-sm">
                Yet to Bat
              </p>
            </div>
          </div>
          <div className="bg-muted rounded-lg p-4 flex justify-between text-sm">
            <div>
              <p className="text-muted-foreground">Current Over</p>
              <p className="font-bold mt-1">18.4</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">Run Rate</p>
              <p className="font-bold mt-1">10.15</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
