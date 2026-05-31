import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarPlus, ChevronRight, Quote } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const cricketQuotes = [
  "Every innings starts with belief.",
  "One clean shot can change the whole match.",
  "Great teams are built one run at a time.",
  "Stay calm at the crease. The scoreboard will follow.",
  "Pressure is just the crowd getting louder.",
];

export default function Home() {
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setQuoteIndex((current) => (current + 1) % cricketQuotes.length);
    }, 3200);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6">
      <section className="page-panel overflow-hidden rounded-2xl p-5">
        <div className="india-accent-strip -mx-5 -mt-5 mb-5 h-1.5" />
        <Badge variant="outline" className="mb-4 border-primary/20 bg-primary/5 text-primary">
          Live Cricket Platform
        </Badge>
        <h1 className="text-[2rem] font-black leading-tight">
          Manage Your Cricket World Easily
        </h1>
        <p className="text-muted-foreground mt-4 text-[0.95rem] leading-7">
          Create matches with teams, manage live scoring, and keep every innings
          organized from toss to result.
        </p>
        <div className="flex flex-col gap-3 mt-6">
          <Button asChild size="lg" className="w-full">
            <Link to="/matches">
              Explore Matches
              <ChevronRight size={20} />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link to="/matches/create">
              <CalendarPlus size={18} />
              Create Match
            </Link>
          </Button>
        </div>
      </section>

      <section className="quote-panel overflow-hidden rounded-2xl border border-border bg-card/85 px-5 py-6 text-center shadow-sm">
        <div className="mx-auto mb-4 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <Quote size={20} />
        </div>
        <p key={quoteIndex} className="quote-transition text-xl font-black leading-snug">
          {cricketQuotes[quoteIndex]}
        </p>
        <div className="mt-5 flex justify-center gap-1.5" aria-hidden="true">
          {cricketQuotes.map((quote, index) => (
            <span
              key={quote}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                index === quoteIndex ? "w-7 bg-primary" : "w-1.5 bg-border"
              }`}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
