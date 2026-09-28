import { AuthUser } from '@/types/auth';

/**
 * Checks whether the given user has authorization to access the specified site.
 * SUPER_ADMIN has global access.
 * ADMIN is strictly restricted to assigned sites.
 */
export function canAccessSite(user: AuthUser | null, targetSiteId?: string | null): boolean {
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;

  // If no specific site is targeted, SUPER_ADMIN has global access (handled above),
  // while ADMIN can only proceed if they have at least one assigned site.
  if (!targetSiteId) {
    return user.role === 'ADMIN' && (user.assignments || []).length > 0;
  }

  if (user.role === 'ADMIN') {
    const assignments = user.assignments || [];
    return assignments.some(
      (a) => a.siteId === targetSiteId || a.id === targetSiteId || a.site?.id === targetSiteId
    );
  }

  return false;
}

/**
 * Returns allowed sites for the given user.
 */
export function getAllowedSiteIds(user: AuthUser | null): string[] | 'ALL' {
  if (!user) return [];
  if (user.role === 'SUPER_ADMIN') return 'ALL';
  return (user.assignments || []).map((a) => a.siteId || a.id);
}
