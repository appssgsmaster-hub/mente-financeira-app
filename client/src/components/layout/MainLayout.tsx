import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useUser } from "@/hooks/use-finance";
import { Bell, Search, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function MainLayout({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useUser();

  const style = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full bg-background overflow-hidden">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="h-20 flex items-center justify-between px-6 lg:px-10 border-b border-border/40 bg-background/80 backdrop-blur-md z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="lg:hidden text-muted-foreground hover:text-foreground" />
              <div>
                {isLoading ? (
                  <Skeleton className="h-8 w-48 rounded-md" />
                ) : (
                  <h1 className="text-2xl font-display font-semibold text-foreground">
                    Bom dia, <span className="text-primary italic">{user?.name || 'Prosperidade'}!</span>
                  </h1>
                )}
                <p className="text-sm text-muted-foreground hidden sm:block">
                  Acompanhe seu ecossistema financeiro.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10">
                <Search className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-secondary rounded-full border-2 border-background"></span>
              </Button>
              <div className="w-px h-8 bg-border/50 mx-2 hidden sm:block"></div>
              <Button variant="outline" className="rounded-full gap-2 hidden sm:flex border-border/50 hover:bg-accent">
                <UserIcon className="w-4 h-4" />
                <span className="font-medium text-sm">Meu Perfil</span>
              </Button>
            </div>
          </header>
          
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 lg:p-10 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-50 pointer-events-none -z-10" />
            <div className="max-w-7xl mx-auto h-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
