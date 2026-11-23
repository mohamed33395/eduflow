import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthUser } from './decorators/current-user.decorator';

/** Roles that manage platform data scoped to a center. */
export const CENTER_STAFF: Role[] = [Role.CENTER_OWNER];
export const ADMINS: Role[] = [Role.SUPER_ADMIN, Role.CENTER_OWNER];

/** Super admin bypasses everything; others must belong to the center. */
export function assertCenterScope(
  actor: AuthUser,
  centerId: string | null | undefined,
) {
  if (actor.role === Role.SUPER_ADMIN) return;
  if (centerId && actor.centerId === centerId) return;
  throw new ForbiddenException('Outside your center scope');
}

/** Effective center filter for list queries — null means "all" (super admin). */
export function centerFilter(actor: AuthUser): string | undefined {
  return actor.role === Role.SUPER_ADMIN ? undefined : (actor.centerId ?? '∅');
}
