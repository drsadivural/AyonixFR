/**
 * Role-Based Access Control (RBAC) Permissions
 * 
 * Roles:
 * - admin: Full system access - can manage users, settings, enrollment, verification, and all operations
 * - user: Limited access - can only perform verification and view events (no enrollment capabilities)
 */

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
export function getPermissions(role: UserRole): Permission {
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
      // User can only verify and view events (no enrollment)
      return {
        canEnroll: false,
        canBatchEnroll: false,
        canVerify: true,
        canViewEnrollees: false,
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
        canViewAnalytics: false,
        canUseSimilaritySearch: false,
      };
  }
}

/**
 * Check if a user has a specific permission
 */
export function hasPermission(role: UserRole, permission: keyof Permission): boolean {
  const permissions = getPermissions(role);
  return permissions[permission];
}

/**
 * Require admin role
 */
export function requireAdmin(role: UserRole): void {
  if (role !== 'admin') {
    throw new Error('Admin access required');
  }
}

/**
 * Check if role can perform write operations
 */
export function canWrite(role: UserRole): boolean {
  return role === 'admin';
}

/**
 * Check if role is admin
 */
export function isAdmin(role: UserRole): boolean {
  return role === 'admin';
}

/**
 * Check if role is user
 */
export function isUser(role: UserRole): boolean {
  return role === 'user';
}
