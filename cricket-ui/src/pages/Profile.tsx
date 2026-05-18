import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Edit3,
  Loader2,
  Medal,
  Phone,
  RefreshCw,
  Shield,
  Star,
  Trophy,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useProfileQuery } from "@/hooks/useProfileQuery";
import { useUpdateProfileMutation } from "@/hooks/useUpdateProfileMutation";
import { getAuthErrorMessage } from "@/services/auth";
import type {
  BattingStats,
  BowlingStats,
  FieldingStats,
} from "@/services/profile";
import { cn } from "@/lib/utils";

type ProfileTab = "batting" | "bowling" | "fielding";

const tabs: { id: ProfileTab; label: string }[] = [
  { id: "batting", label: "Batting" },
  { id: "bowling", label: "Bowling" },
  { id: "fielding", label: "Fielding" },
];

export default function Profile() {
  const { token, setSession } = useAuth();
  const {
    data: profile,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useProfileQuery();
  const updateProfileMutation = useUpdateProfileMutation();
  const [activeTab, setActiveTab] = useState<ProfileTab>("batting");
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [battingStyle, setBattingStyle] = useState("");
  const [bowlingStyle, setBowlingStyle] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (profile?.user.name) {
      setName(profile.user.name);
    }
    setProfileImage(profile?.user.profile_image ?? "");
    setBattingStyle(profile?.user.batting_style ?? "");
    setBowlingStyle(profile?.user.bowling_style ?? "");
  }, [
    profile?.user.name,
    profile?.user.profile_image,
    profile?.user.batting_style,
    profile?.user.bowling_style,
  ]);

  const initials = useMemo(() => {
    const source = profile?.user.name || "Player";
    return source
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [profile?.user.name]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Please enter your name");
      return;
    }

    try {
      setError("");
      const nextProfile = await updateProfileMutation.mutateAsync({
        name: trimmedName,
        profile_image: profileImage.trim() || null,
        batting_style: battingStyle.trim() || null,
        bowling_style: bowlingStyle.trim() || null,
      });

      setSession({
        token,
        user: nextProfile.user,
      });
      setIsEditing(false);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="animate-spin" size={20} />
        <span className="text-sm font-semibold">Loading profile</span>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="min-h-[70vh] rounded-2xl border border-dashed border-border bg-muted px-6 py-16 text-center">
        <p className="font-bold">Could not load profile</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Check your session and try again.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-5 gap-2"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <RefreshCw size={16} />
          )}
          Retry
        </Button>
      </div>
    );
  }

  const { user, summary } = profile;

  return (
    <div className="mx-auto max-w-[430px] pb-24">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
            Player Profile
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">
            My Cricket Card
          </h1>
        </div>
        <span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Shield size={22} />
        </span>
      </div>

      <Card className="overflow-hidden border-border bg-card/95 py-0 shadow-xl">
        <div className="india-accent-strip h-1.5" />
        <CardContent className="p-5">
          <div className="rounded-2xl border border-border bg-background/75 p-4 shadow-inner">
            <div className="flex items-center gap-4">
              <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-primary/30 bg-primary/15 text-2xl font-black text-primary">
                {user.profile_image ? (
                  <img
                    src={user.profile_image}
                    alt={user.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>

              <div className="min-w-0 flex-1">
                {isEditing ? (
                  <form onSubmit={handleSaveProfile} className="space-y-3">
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-10 bg-card text-base font-bold"
                      placeholder="Name"
                      maxLength={100}
                      disabled={updateProfileMutation.isPending}
                    />
                    <Input
                      value={profileImage}
                      onChange={(e) => setProfileImage(e.target.value)}
                      className="h-10 bg-card text-sm"
                      placeholder="Profile image URL"
                      disabled={updateProfileMutation.isPending}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={battingStyle}
                        onChange={(e) => setBattingStyle(e.target.value)}
                        className="h-10 bg-card text-sm"
                        placeholder="Batting style"
                        disabled={updateProfileMutation.isPending}
                      />
                      <Input
                        value={bowlingStyle}
                        onChange={(e) => setBowlingStyle(e.target.value)}
                        className="h-10 bg-card text-sm"
                        placeholder="Bowling style"
                        disabled={updateProfileMutation.isPending}
                      />
                    </div>
                    <p className="text-[10px] font-medium text-muted-foreground">
                      Example: Right hand bat, Left arm spin
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending ? (
                          <Loader2 className="animate-spin" size={16} />
                        ) : (
                          "Save"
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setName(user.name);
                          setProfileImage(user.profile_image ?? "");
                          setBattingStyle(user.batting_style ?? "");
                          setBowlingStyle(user.bowling_style ?? "");
                          setIsEditing(false);
                          setError("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="truncate text-2xl font-black uppercase leading-tight">
                        {user.name}
                      </h2>
                      <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                        <Phone size={13} />
                        {user.phone_number}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0 gap-1 text-primary"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit3 size={14} />
                      Edit
                    </Button>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <StylePill
                    icon={Activity}
                    label={user.batting_style || "Batting style"}
                  />
                  <StylePill
                    icon={Shield}
                    label={user.bowling_style || "Bowling style"}
                  />
                </div>
              </div>
            </div>

            {error && (
              <p className="mt-3 text-sm font-medium text-destructive">
                {error}
              </p>
            )}

            <div className="mt-5 grid grid-cols-[1fr_auto] items-center gap-4">
              <div className="grid grid-cols-4 gap-2 text-center">
                <SummaryMini value={summary.matches_played} label="Played" />
                <SummaryMini value={summary.won} label="Won" />
                <SummaryMini value={summary.lost} label="Lost" />
                <SummaryMini value={summary.mvps} label="MVPs" />
              </div>
              <WinRing value={summary.win_percentage} />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <HeroMetric icon={Star} label="Points" value={summary.points} />
            <HeroMetric
              icon={Trophy}
              label="Win %"
              value={`${summary.win_percentage}%`}
            />
          </div>
        </CardContent>
      </Card>

      <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl border border-border bg-card p-1 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "h-10 rounded-xl text-xs font-black uppercase tracking-wide transition",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section className="mt-5">
        {activeTab === "batting" && <BattingPanel stats={profile.batting} />}
        {activeTab === "bowling" && <BowlingPanel stats={profile.bowling} />}
        {activeTab === "fielding" && <FieldingPanel stats={profile.fielding} />}
      </section>
    </div>
  );
}

function StylePill({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
      <Icon size={12} />
      {label}
    </span>
  );
}

function SummaryMini({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="text-lg font-black leading-none">{value}</p>
      <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function WinRing({ value }: { value: number }) {
  return (
    <div className="grid place-items-center">
      <div
        className="grid size-17 place-items-center rounded-full"
        style={{
          background: `conic-gradient(#ff8a00 ${value * 3.6}deg, rgb(255 255 255 / 0.12) 0deg)`,
        }}
      >
        <div className="grid size-13 place-items-center rounded-full bg-card text-center">
          <p className="text-sm font-black">{value}%</p>
          <p className="text-[8px] font-bold uppercase text-muted-foreground">
            Win
          </p>
        </div>
      </div>
    </div>
  );
}

function HeroMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <Icon size={18} className="mb-2 text-primary" />
      <p className="text-2xl font-black leading-none">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function BattingPanel({ stats }: { stats: BattingStats }) {
  return (
    <StatsPanel title="Batting Stats" icon={BarChart3}>
      <StatGrid
        items={[
          ["Average", stats.average],
          ["Strike Rate", stats.strike_rate],
          ["High Score", stats.high_score],
          ["Runs", stats.runs],
          ["Innings", stats.innings],
          ["Fours", stats.fours],
          ["Sixes", stats.sixes],
        ]}
      />
    </StatsPanel>
  );
}

function BowlingPanel({ stats }: { stats: BowlingStats }) {
  return (
    <StatsPanel title="Bowling Stats" icon={Activity}>
      <StatGrid
        items={[
          ["Overs", stats.overs_bowled],
          ["Wickets", stats.wickets],
          ["Runs Given", stats.runs_conceded],
          ["Maidens", stats.maidens],
          ["Economy", stats.economy],
        ]}
      />
    </StatsPanel>
  );
}

function FieldingPanel({ stats }: { stats: FieldingStats }) {
  return (
    <StatsPanel title="Fielding Stats" icon={Medal}>
      <StatGrid
        items={[
          ["Catches", stats.catches],
          ["Stumping", stats.stumping],
          ["Run Outs", stats.run_outs],
        ]}
      />
    </StatsPanel>
  );
}

function StatsPanel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number }>;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border bg-card py-0 shadow-sm">
      <CardContent className="p-4">
        <div className="mb-4 flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-primary/15 text-primary">
            <Icon size={17} />
          </span>
          <h3 className="text-sm font-black uppercase tracking-[0.18em]">
            {title}
          </h3>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function StatGrid({ items }: { items: [string, number][] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map(([label, value], index) => (
        <div
          key={label}
          className={cn(
            "rounded-xl border border-border bg-background p-4",
            index < 3 && "bg-primary/10",
          )}
        >
          <p className="text-2xl font-black leading-none text-primary">
            {value}
          </p>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
        </div>
      ))}
    </div>
  );
}
