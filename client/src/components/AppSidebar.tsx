import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { LayoutDashboard, UserPlus, Users, ScanFace, Activity, Settings, LogOut, FolderUp, GitCompare, Shield, Volume2, KeyRound } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";

const menuItems = [
  { title: "Dashboard", icon: LayoutDashboard, url: "/" },
  { title: "Enrollment", icon: UserPlus, url: "/enrollment" },
  { title: "Batch Enrollment", icon: FolderUp, url: "/batch-enrollment" },
  { title: "Similarity Search", icon: GitCompare, url: "/similarity-search" },
  { title: "Enrollees", icon: Users, url: "/enrollees" },
  { title: "Verification", icon: ScanFace, url: "/verification" },
  { title: "Events", icon: Activity, url: "/events" },
  { title: "Settings", icon: Settings, url: "/settings" },
  { title: "Voice Settings", icon: Volume2, url: "/voice-settings" },
  { title: "API Keys", icon: KeyRound, url: "/api-keys" },
  { title: "User Management", icon: Shield, url: "/user-management", adminOnly: true },
];

export function AppSidebar() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const { permissions } = usePermissions();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
    onError: () => {
      toast.error('Failed to logout');
    },
  });

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <ScanFace className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Ayonix</h2>
            <p className="text-xs text-muted-foreground">Face Recognition</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.filter((item) => {
                // Filter menu items based on permissions
                if (item.url === '/enrollment' || item.url === '/batch-enrollment') {
                  return permissions.canEnroll;
                }
                if (item.url === '/verification') {
                  return permissions.canVerify;
                }
                if (item.url === '/similarity-search') {
                  return permissions.canUseSimilaritySearch;
                }
                if (item.url === '/settings') {
                  return permissions.canViewSettings;
                }
                if ((item as any).adminOnly) {
                  return permissions.canViewUsers;
                }
                return true; // Dashboard, Enrollees, Events are visible to all
              }).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    isActive={location === item.url}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <div className="space-y-2">
          <div className="text-sm">
            <p className="font-medium">{user?.name || 'User'}</p>
            <p className="text-xs text-muted-foreground">{user?.email || ''}</p>
            {user?.role && (
              <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                <Shield className="h-3 w-3" />
                <span className="capitalize">{user.role}</span>
              </div>
            )}
          </div>
          <SidebarMenuButton
            onClick={() => logoutMutation.mutate()}
            className="w-full"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </SidebarMenuButton>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
