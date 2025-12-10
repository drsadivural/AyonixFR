/**
 * Role-Based Access Control (RBAC) Permissions
 * 
 * Roles:
 * - admin: Full system access, can manage users, settings, and all operations
 * - operator: Can enroll, verify, and manage enrollees but cannot change settings or manage users
 * - viewer: Read-only access, can view dashboard, enrollees, events, but cannot modify anything
 */

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
export function getPermissions(role: UserRole): Permission {
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
        canDeleteEnrollee: false, // Operators cannot delete
        canViewSettings: true,
        canEditSettings: false, // Operators cannot change settings
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
 * Require operator or admin role
 */
export function requireOperatorOrAdmin(role: UserRole): void {
  if (role !== 'admin' && role !== 'operator') {
    throw new Error('Operator or admin access required');
  }
}

/**
 * Check if role can perform write operations
 */
export function canWrite(role: UserRole): boolean {
  return role === 'admin' || role === 'operator';
}

/**
 * Check if role is admin
 */
export function isAdmin(role: UserRole): boolean {
  return role === 'admin';
}

/**
 * Check if role is operator
 */
export function isOperator(role: UserRole): boolean {
  return role === 'operator';
}

/**
 * Check if role is viewer
 */
export function isViewer(role: UserRole): boolean {
  return role === 'viewer';
}
