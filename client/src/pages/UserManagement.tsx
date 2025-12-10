import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Shield, User, Eye } from "lucide-react";

export default function UserManagement() {
  const utils = trpc.useUtils();
  
  const { data: users, isLoading } = trpc.users.list.useQuery();
  const updateRoleMutation = trpc.users.updateRole.useMutation({
    onSuccess: () => {
      toast.success("User role has been successfully updated.");
      utils.users.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleRoleChange = (userId: number, newRole: 'admin' | 'operator' | 'viewer') => {
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-5 w-5 text-blue-600" />;
      case 'operator':
        return <User className="h-5 w-5 text-green-600" />;
      case 'viewer':
        return <Eye className="h-5 w-5 text-gray-600" />;
      default:
        return <User className="h-5 w-5 text-gray-400" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'operator':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'viewer':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading users...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">User Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage user roles and permissions for the Ayonix Face Recognition System
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            View and manage user roles. Only administrators can change user permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users && users.length > 0 ? (
              <div className="divide-y divide-border">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="py-4 flex items-center justify-between hover:bg-accent/50 transition-colors px-4 rounded-lg"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white font-semibold text-lg">
                        {user.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-foreground">{user.name || 'Unnamed User'}</div>
                        <div className="text-sm text-muted-foreground">{user.email || 'No email provided'}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Joined: {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${getRoleBadgeColor(user.role)}`}>
                        {getRoleIcon(user.role)}
                        <span className="text-sm font-medium capitalize">{user.role}</span>
                      </div>

                      <Select
                        value={user.role}
                        onValueChange={(value) => handleRoleChange(user.id, value as 'admin' | 'operator' | 'viewer')}
                        disabled={updateRoleMutation.isPending}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Change role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-blue-600" />
                              <span>Admin</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="operator">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-green-600" />
                              <span>Operator</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="viewer">
                            <div className="flex items-center gap-2">
                              <Eye className="h-4 w-4 text-gray-600" />
                              <span>Viewer</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No users found in the system.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
          <CardDescription>Understanding user roles and their capabilities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
              <Shield className="h-6 w-6 text-blue-600 mt-0.5" />
              <div>
                <div className="font-semibold text-blue-900">Administrator</div>
                <div className="text-sm text-blue-700 mt-1">
                  Full system access including user management, enrollment, verification, settings, and audit logs.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
              <User className="h-6 w-6 text-green-600 mt-0.5" />
              <div>
                <div className="font-semibold text-green-900">Operator</div>
                <div className="text-sm text-green-700 mt-1">
                  Can enroll new faces, perform verification, and view enrollees. Cannot modify system settings or manage users.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
              <Eye className="h-6 w-6 text-gray-600 mt-0.5" />
              <div>
                <div className="font-semibold text-gray-900">Viewer</div>
                <div className="text-sm text-gray-700 mt-1">
                  Read-only access to view enrollees and verification logs. Cannot enroll faces or modify any data.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
