import AppRoutes from "./routes/AppRoutes";

export default function App() {
  return (
    <div className="app-shell flex min-h-[100dvh] min-h-[100svh] flex-col bg-background">
      <AppRoutes />
    </div>
  );
}
