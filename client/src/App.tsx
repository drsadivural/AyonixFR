import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import NotFound from "@/pages/NotFound";
import Dashboard from "@/pages/Dashboard";
import Enrollment from "@/pages/Enrollment";
import BatchEnrollment from "./pages/BatchEnrollment";
import SimilaritySearch from "./pages/SimilaritySearch";
import Enrollees from "@/pages/Enrollees";
import Verification from "@/pages/Verification";
import Events from "@/pages/Events";
import Settings from "@/pages/Settings";
import Register from "@/pages/Register";
import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import UserManagement from "@/pages/UserManagement";
import VoiceSettings from "@/pages/VoiceSettings";
import APIKeysSettings from "@/pages/APIKeysSettings";
import ChatAssistant from "@/components/ChatAssistant";
import { GlobalVoiceAssistant } from "@/components/GlobalVoiceAssistant";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import { Loader2 } from "lucide-react";

function AuthenticatedApp() {
  const { user, loading } = useAuth();
  const [location] = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show login/register pages for unauthenticated users
  if (!user) {
    return (
      <Switch>
        <Route path="/register" component={Register} />
        <Route path="/login" component={Login} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route>
          {() => {
            // Redirect to register if trying to access protected route
            if (location !== '/login' && location !== '/register' && location !== '/forgot-password' && !location.startsWith('/reset-password')) {
              window.location.href = '/register';
            }
            return <Register />;
          }}
        </Route>
      </Switch>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 p-6 lg:p-8">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/enrollment" component={Enrollment} />
            <Route path="/batch-enrollment" component={BatchEnrollment} />
            <Route path="/similarity-search" component={SimilaritySearch} />
            <Route path="/enrollees" component={Enrollees} />
            <Route path="/verification" component={Verification} />
            <Route path="/events" component={Events} />
            <Route path="/settings" component={Settings} />
              <Route path="/voice-settings" component={VoiceSettings} />
            <Route path="/api-keys" component={APIKeysSettings} />
            <Route path="/user-management" component={UserManagement} />
            <Route path="/404" component={NotFound} />
            <Route component={NotFound} />
          </Switch>
        </main>
        <ChatAssistant />
      </div>
      <GlobalVoiceAssistant />
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
