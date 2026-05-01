import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useClerk } from "@clerk/react";
import { LayoutDashboard, FolderKanban, LogOut, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Sidebar({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { signOut } = useClerk();

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Projects", href: "/projects", icon: FolderKanban },
  ];

  return (
    <div className="flex min-h-[100dvh] bg-muted/20">
      <aside className="w-64 border-r bg-background flex flex-col sticky top-0 h-[100dvh]">
        <div className="p-6">
          <Link href="/dashboard" className="flex items-center gap-2 text-primary">
            <CheckCircle2 className="h-6 w-6" />
            <span className="font-bold text-xl tracking-tight text-foreground">TaskFlow</span>
          </Link>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground"
            onClick={() => signOut()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
