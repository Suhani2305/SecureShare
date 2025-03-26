import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import Register from "@/pages/register";
import MfaVerification from "@/pages/mfa-verification";
import MfaSetup from "@/pages/mfa-setup";
import MyFiles from "@/pages/my-files";
import SharedFiles from "@/pages/shared-files";
import UserManagement from "@/pages/admin/user-management";
import ActivityLogs from "@/pages/admin/activity-logs";
import { AuthProvider, RequireAuth, RequireAdmin } from "@/utils/auth";
import TeamFiles from "@/pages/team-files";
import TrashFiles from "@/pages/trash";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/mfa-verification" component={MfaVerification} />
      <Route path="/">
        <RequireAuth>
          <Dashboard />
        </RequireAuth>
      </Route>
      <Route path="/my-files">
        <RequireAuth>
          <MyFiles />
        </RequireAuth>
      </Route>
      <Route path="/team-files">
        <RequireAuth>
          <TeamFiles />
        </RequireAuth>
      </Route>
      <Route path="/trash">
        <RequireAuth>
          <TrashFiles />
        </RequireAuth>
      </Route>
      <Route path="/shared-files">
        <RequireAuth>
          <SharedFiles />
        </RequireAuth>
      </Route>
      <Route path="/mfa-setup">
        <RequireAuth>
          <MfaSetup />
        </RequireAuth>
      </Route>
      <Route path="/admin/users">
        <RequireAdmin>
          <UserManagement />
        </RequireAdmin>
      </Route>
      <Route path="/admin/activity-logs">
        <RequireAdmin>
          <ActivityLogs />
        </RequireAdmin>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
