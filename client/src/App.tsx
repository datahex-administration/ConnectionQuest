import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";

import NotFound from "@/pages/not-found";
import Welcome from "@/pages/welcome";
import Registration from "@/pages/registration";
import CodeSession from "@/pages/code-session";
import Game from "@/pages/game";
import Results from "@/pages/results";
import AdminLogin from "@/pages/admin/login";
import AdminDashboard from "@/pages/admin/dashboard";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Welcome} />
      <Route path="/register" component={Registration} />
      <Route path="/code-session" component={CodeSession} />
      <Route path="/game/:code" component={Game} />
      <Route path="/results/:code" component={Results} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="container mx-auto p-4 min-h-screen">
        <Router />
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;
