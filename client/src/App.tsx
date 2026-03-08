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
import { Loader2 } from "lucide-react";

function PublicRoutes() {
  return (
    <Switch>
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/terms-of-use" component={TermsOfUse} />
      <Route path="/reset-password" component={ResetPassword} />
    </Switch>
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
      <MainLayout>
        <Switch>
          <Route path="/planos" component={Plans} />
          <Route>
            <Plans />
          </Route>
        </Switch>
      </MainLayout>
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
