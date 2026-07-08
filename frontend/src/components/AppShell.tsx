import { Sidebar } from "@/components/Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 bg-[var(--color-parchment)] min-h-screen">
        {children}
      </div>
    </div>
  );
}