import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { MainLayout } from "./components/layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Projections from "./pages/Projections";
import Payments from "./pages/Payments";
import Education from "./pages/Education";
import Plans from "./pages/Plans";

function Router() {
  return (
    <MainLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/ajustes" component={Settings} />
        <Route path="/projecoes" component={Projections} />
        <Route path="/pagamentos" component={Payments} />
        <Route path="/educacao" component={Education} />
        <Route path="/planos" component={Plans} />
        {/* Fallback to 404 */}
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
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
