import { useAuth } from "@/_core/hooks/useAuth";

export type UserRole = 'admin' | 'operator' | 'viewer';

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
    
    case 'operator':
      return {
        canEnroll: true,
        canBatchEnroll: true,
        canVerify: true,
        canViewEnrollees: true,
        canEditEnrollee: true,
        canDeleteEnrollee: false,
        canViewSettings: true,
        canEditSettings: false,
        canViewUsers: false,
        canManageUsers: false,
        canChangeUserRoles: false,
        canViewEvents: true,
        canExportEvents: true,
        canViewDashboard: true,
        canViewAnalytics: true,
        canUseSimilaritySearch: true,
      };
    
    case 'viewer':
      return {
        canEnroll: false,
        canBatchEnroll: false,
        canVerify: false,
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
  }
}

/**
 * Hook to get current user's permissions
 */
export function usePermissions() {
  const { user } = useAuth();
  
  if (!user) {
    // Return no permissions for unauthenticated users
    return {
      permissions: getPermissions('viewer'),
      role: 'viewer' as UserRole,
      hasPermission: () => false,
      isAdmin: false,
      isOperator: false,
      isViewer: true,
    };
  }
  
  const role = (user.role || 'viewer') as UserRole;
  const permissions = getPermissions(role);
  
  return {
    permissions,
    role,
    hasPermission: (permission: keyof Permission) => permissions[permission],
    isAdmin: role === 'admin',
    isOperator: role === 'operator',
    isViewer: role === 'viewer',
  };
}
