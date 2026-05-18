import BottomNav from "@/components/BottomNav";
import Navbar from "@/components/Navbar";

type MainLayoutProps = {
  children: React.ReactNode;
};

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="team-india-surface flex min-h-[100dvh] min-h-[100svh] flex-col text-foreground">
      <Navbar />
      <main className="flex-1 px-3 py-3 pb-[max(6.5rem,calc(5rem+env(safe-area-inset-bottom,0px)))] pt-1">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
