import { ReactNode, useMemo, useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/hooks/use-auth";
import { useAccounts, useTransactions } from "@/hooks/use-finance";
import { getMentorMessage } from "@/lib/mentor-messages";
import { Bell, Search, User as UserIcon, LogOut, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function MainLayout({ children }: { children: ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const { data: accounts } = useAccounts();
  const { data: transactions } = useTransactions();

  const style = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "4rem",
  };

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  }

  function getTrialDaysLeft() {
    if (!user?.trialEndDate || user.subscriptionStatus !== "trial") return null;
    const end = new Date(user.trialEndDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }

  const trialDays = getTrialDaysLeft();

  const mentorMessage = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const totalBalance = accounts?.reduce((s, a) => s + a.balance, 0) || 0;
    const monthlyIncome = transactions
      ?.filter(t => t.type === "income" && new Date(t.date).getTime() >= startOfMonth)
      .reduce((s, t) => s + t.amount, 0) || 0;
    const monthlyExpense = transactions
      ?.filter(t => t.type === "expense" && new Date(t.date).getTime() >= startOfMonth)
      .reduce((s, t) => s + t.amount, 0) || 0;

    let commitmentAlerts = 0;
    try {
      if (user?.id) {
        const raw = localStorage.getItem(`sgs_commitments_v1_user_${user.id}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          const nextWeek = new Date();
          nextWeek.setDate(now.getDate() + 7);
          const nextWeekStr = nextWeek.toISOString().split('T')[0];
          commitmentAlerts = parsed.filter((c: any) => c.startDate <= nextWeekStr).length;
        }
      }
    } catch {}

    return getMentorMessage({
      totalBalance,
      monthlyIncome,
      monthlyExpense,
      transactionCount: transactions?.length || 0,
      accountCount: accounts?.length || 0,
      savingsRatio: monthlyIncome > 0 ? (monthlyIncome - monthlyExpense) / monthlyIncome : 0,
      hasCommitments: commitmentAlerts > 0,
      alertCount: commitmentAlerts,
      userName: user?.name?.split(' ')[0] || '',
      dayOfWeek: now.getDay(),
      hour: now.getHours(),
    });
  }, [accounts, transactions, user?.id, user?.name]);

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
                    {getGreeting()}, <span className="text-primary italic">{user?.name?.split(' ')[0] || 'Prosperidade'}!</span>
                  </h1>
                )}
                <div className="flex items-center gap-3">
                  <p className="text-sm text-muted-foreground hidden sm:block max-w-md" data-testid="text-mentor-message">
                    <Sparkles className="w-3.5 h-3.5 inline-block mr-1.5 text-primary/60 -translate-y-px" />
                    <span className="italic">{mentorMessage}</span>
                  </p>
                  {trialDays !== null && (
                    <span className="text-xs bg-secondary/10 text-secondary px-2.5 py-0.5 rounded-full font-semibold hidden sm:inline-block" data-testid="text-trial-badge">
                      {trialDays} {trialDays === 1 ? 'dia' : 'dias'} de teste
                    </span>
                  )}
                </div>
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="rounded-full gap-2 hidden sm:flex border-border/50 hover:bg-accent" data-testid="button-user-menu">
                    <UserIcon className="w-4 h-4" />
                    <span className="font-medium text-sm max-w-[120px] truncate">{user?.name?.split(' ')[0]}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="font-medium text-sm">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => logout()}
                    className="text-destructive cursor-pointer"
                    data-testid="button-logout"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
