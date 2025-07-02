import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/Dashboard";
import HouseholdDetail from "@/pages/HouseholdDetail";
import TaxReport from "@/pages/TaxReport";
import IndividualTaxReport from "@/pages/IndividualTaxReport";
import T1Extract from "@/pages/T1Extract";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/household/:id" component={HouseholdDetail} />
      <Route path="/household/:householdId/report/:year" component={TaxReport} />
      <Route path="/household/:householdId/individual/:clientId/:year" component={IndividualTaxReport} />
      <Route path="/household/:householdId/t1-extract/:t1ReturnId" component={T1Extract} />
      <Route component={NotFound} />
    </Switch>
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
