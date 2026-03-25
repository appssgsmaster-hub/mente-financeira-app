import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { MainLayout } from "./components/layout/MainLayout";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Projections from "./pages/Projections";
import Payments from "./pages/Payments";
import Education from "./pages/Education";
import Plans from "./pages/Plans";
import MentoriaWelcome from "./pages/MentoriaWelcome";
import DebtStrategy from "./pages/DebtStrategy";
import ResetPassword from "./pages/ResetPassword";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";
import { Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

function PublicRoutes() {
  return (
    <Switch>
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/terms-of-use" component={TermsOfUse} />
      <Route path="/reset-password" component={ResetPassword} />
    </Switch>
  );
}

function ExpiredLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-14 flex items-center justify-between px-4 sm:px-8 border-b border-border/40 bg-background/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-xs tracking-tight">MF</span>
          </div>
          <span className="font-bold font-display text-primary text-base">Mente Financeira</span>
        </div>
        <div className="flex items-center gap-2">
          {user?.name && (
            <span className="text-sm text-muted-foreground hidden sm:block truncate max-w-[160px]">{user.name}</span>
          )}
          <Button variant="ghost" size="sm" onClick={() => logout()} className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive" data-testid="button-logout-expired">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-10">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

function AppRoutes() {
  const { user, isLoading } = useAuth();

  const path = window.location.pathname;
  if (path === "/privacy-policy" || path === "/terms-of-use" || path === "/reset-password") {
    return <PublicRoutes />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const isExpired = user.subscriptionStatus === "trial_expired" || user.subscriptionStatus === "canceled";

  if (isExpired) {
    return (
      <ExpiredLayout>
        <Plans />
      </ExpiredLayout>
    );
  }

  return (
    <MainLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/ajustes" component={Settings} />
        <Route path="/projecoes" component={Projections} />
        <Route path="/pagamentos" component={Payments} />
        <Route path="/educacao" component={Education} />
        <Route path="/planos" component={Plans} />
        <Route path="/mentoria/boas-vindas" component={MentoriaWelcome} />
        <Route path="/dividas" component={DebtStrategy} />
        <Route component={NotFound} />
      </Switch>
    </MainLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
