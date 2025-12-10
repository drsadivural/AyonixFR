import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import NotFound from "@/pages/NotFound";
import Dashboard from "@/pages/Dashboard";
import Enrollment from "@/pages/Enrollment";
import BatchEnrollment from "@/pages/BatchEnrollment";
import Enrollees from "@/pages/Enrollees";
import Verification from "@/pages/Verification";
import Events from "@/pages/Events";
import Settings from "@/pages/Settings";
import Register from "@/pages/Register";
import ChatAssistant from "@/components/ChatAssistant";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import { getLoginUrl } from "./const";
import { Button } from "./components/ui/button";
import { Loader2 } from "lucide-react";

function AuthenticatedApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to registration if profile not completed
  if (user && !(user as any).profileCompleted && window.location.pathname !== '/register') {
    window.location.href = '/register';
    return null;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Ayonix Face Recognition</h1>
          <p className="text-muted-foreground mb-6">
            Professional biometric face recognition system
          </p>
        </div>
        <Button onClick={() => window.location.href = getLoginUrl()}>
          Sign In to Continue
        </Button>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 p-6 lg:p-8">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/register" component={Register} />
            <Route path="/enrollment" component={Enrollment} />
          <Route path="/batch-enrollment" component={BatchEnrollment} />
            <Route path="/enrollees" component={Enrollees} />
            <Route path="/verification" component={Verification} />
            <Route path="/events" component={Events} />
            <Route path="/settings" component={Settings} />
            <Route path="/404" component={NotFound} />
            <Route component={NotFound} />
          </Switch>
        </main>
        <ChatAssistant />
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <AuthenticatedApp />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
