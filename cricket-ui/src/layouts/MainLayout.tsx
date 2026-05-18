import Navbar from "@/components/Navbar";

type MainLayoutProps = {
  children: React.ReactNode;
};

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="team-india-surface min-h-screen text-foreground">
      <Navbar />
      <main className="px-3 py-3 pb-20">{children}</main>
    </div>
  );
}
