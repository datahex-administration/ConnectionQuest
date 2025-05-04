import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "@/lib/theme-provider";
import { ProtectedRoute } from "@/lib/protected-route";
import { AdminRoute } from "@/lib/admin-route";

import NotFound from "@/pages/not-found";
import Welcome from "@/pages/welcome";
import Registration from "@/pages/registration";
import CodeSession from "@/pages/code-session";
import Game from "@/pages/game";
import Results from "@/pages/results";
import AdminLogin from "@/pages/admin/login";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminQuestions from "@/pages/admin/questions";
import AdminParticipants from "@/pages/admin/participants";
import AdminSettings from "@/pages/admin/settings";

function Router() {
  return (
    <Switch>
      {/* Public paths */}
      <Route path="/" component={Welcome} />
      <Route path="/register" component={Registration} />
      <Route path="/admin/login" component={AdminLogin} />
      
      {/* Protected paths - require user authentication */}
      <ProtectedRoute path="/code-session" component={CodeSession} />
      <ProtectedRoute path="/game/:code" component={Game} />
      <ProtectedRoute path="/results/:code" component={Results} />
      <Route path="/admin/dashboard">
        {() => <AdminRoute component={AdminDashboard} />}
      </Route>
      <Route path="/admin/questions">
        {() => <AdminRoute component={AdminQuestions} />}
      </Route>
      <Route path="/admin/participants">
        {() => <AdminRoute component={AdminParticipants} />}
      </Route>
      <Route path="/admin/settings">
        {() => <AdminRoute component={AdminSettings} />}
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <div className="container mx-auto p-4 min-h-screen">
            <Router />
            <Toaster />
          </div>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
