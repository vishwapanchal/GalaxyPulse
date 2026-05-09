import Sidebar from "@/components/ui/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full relative">
      <Sidebar />
      <main className="flex-1 pl-72 pr-8 pt-8 pb-20 w-full relative z-10">
        {children}
      </main>
    </div>
  );
}
