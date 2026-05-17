import Navbar from "@/components/Navbar";

type MainLayoutProps = {
  children: React.ReactNode;
};

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="px-4 py-5 pb-24">{children}</main>
    </div>
  );
}
