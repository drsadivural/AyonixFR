import { useAuth } from "@/_core/hooks/useAuth";

export type UserRole = 'admin' | 'user';

export interface Permission {
  // Enrollment permissions
  canEnroll: boolean;
  canBatchEnroll: boolean;
  
  // Verification permissions
  canVerify: boolean;
  
  // Enrollee management
  canViewEnrollees: boolean;
  canEditEnrollee: boolean;
  canDeleteEnrollee: boolean;
  
  // Settings permissions
  canViewSettings: boolean;
  canEditSettings: boolean;
  
  // User management
  canViewUsers: boolean;
  canManageUsers: boolean;
  canChangeUserRoles: boolean;
  
  // Events and audit trail
  canViewEvents: boolean;
  canExportEvents: boolean;
  
  // Dashboard and analytics
  canViewDashboard: boolean;
  canViewAnalytics: boolean;
  
  // Similarity search
  canUseSimilaritySearch: boolean;
}

/**
 * Get permissions for a given role
 */
function getPermissions(role: UserRole): Permission {
  switch (role) {
    case 'admin':
      // Admin has full access to everything
      return {
        canEnroll: true,
        canBatchEnroll: true,
        canVerify: true,
        canViewEnrollees: true,
        canEditEnrollee: true,
        canDeleteEnrollee: true,
        canViewSettings: true,
        canEditSettings: true,
        canViewUsers: true,
        canManageUsers: true,
        canChangeUserRoles: true,
        canViewEvents: true,
        canExportEvents: true,
        canViewDashboard: true,
        canViewAnalytics: true,
        canUseSimilaritySearch: true,
      };
    
    case 'user':
      // Regular users can only verify and view events
      return {
        canEnroll: false,
        canBatchEnroll: false,
        canVerify: true,
        canViewEnrollees: true,
        canEditEnrollee: false,
        canDeleteEnrollee: false,
        canViewSettings: false,
        canEditSettings: false,
        canViewUsers: false,
        canManageUsers: false,
        canChangeUserRoles: false,
        canViewEvents: true,
        canExportEvents: false,
        canViewDashboard: true,
        canViewAnalytics: true,
        canUseSimilaritySearch: false,
      };
    
    default:
      // Fallback to user permissions for unknown roles
      return getPermissions('user');
  }
}

/**
 * Hook to get current user's permissions
 */
export function usePermissions() {
  const { user } = useAuth();
  
  if (!user) {
    // Return limited permissions for unauthenticated users
    return {
      permissions: getPermissions('user'),
      role: 'user' as UserRole,
      hasPermission: () => false,
      isAdmin: false,
      isUser: true,
    };
  }
  
  const role = (user.role || 'user') as UserRole;
  const permissions = getPermissions(role);
  
  return {
    permissions,
    role,
    hasPermission: (permission: keyof Permission) => permissions[permission],
    isAdmin: role === 'admin',
    isUser: role === 'user',
  };
}
