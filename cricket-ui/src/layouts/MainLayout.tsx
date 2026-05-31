import Navbar from "@/components/Navbar";

type MainLayoutProps = {
  children: React.ReactNode;
};

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="app-shell team-india-surface text-foreground">
      <Navbar />
      <main className="px-3 py-4 pb-20">{children}</main>
    </div>
  );
}
