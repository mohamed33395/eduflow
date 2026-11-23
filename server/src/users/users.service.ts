import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { CreateUserDto, ListUsersQuery, UpdateUserDto } from './dto/users.dto';

const SAFE_SELECT = {
  id: true,
  username: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  avatarUrl: true,
  centerId: true,
  courseId: true,
  isActive: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Who can create/manage whom. */
  private assertCanManage(actor: AuthUser, targetRole: Role, targetCenterId?: string | null) {
    if (actor.role === Role.SUPER_ADMIN) return;
    if (actor.role === Role.CENTER_OWNER) {
      const allowed: Role[] = [Role.TEACHER, Role.STUDENT, Role.COURSE_OWNER];
      if (!allowed.includes(targetRole)) {
        throw new ForbiddenException('Center owner can only manage staff & students');
      }
      if (targetCenterId && targetCenterId !== actor.centerId) {
        throw new ForbiddenException('Outside your center');
      }
      return;
    }
    throw new ForbiddenException('Insufficient permissions');
  }

  async create(actor: AuthUser, dto: CreateUserDto) {
    const centerId =
      actor.role === Role.CENTER_OWNER ? actor.centerId : dto.centerId;
    this.assertCanManage(actor, dto.role, centerId);

    const clash = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: dto.username },
          ...(dto.email ? [{ email: dto.email }] : []),
        ],
      },
      select: { id: true },
    });
    if (clash) throw new ConflictException('Username or email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: dto.name,
          username: dto.username,
          email: dto.email,
          phone: dto.phone,
          role: dto.role,
          centerId,
          courseId: dto.courseId,
          passwordHash,
        },
        select: SAFE_SELECT,
      });
      // Keep 1:1 profile rows in sync with the role.
      if (dto.role === Role.STUDENT) {
        await tx.studentProfile.create({ data: { id: user.id, centerId } });
      } else if (dto.role === Role.TEACHER) {
        await tx.teacherProfile.create({ data: { id: user.id, centerId } });
      }
      return user;
    });
  }

  async list(actor: AuthUser, query: ListUsersQuery) {
    const centerId =
      actor.role === Role.SUPER_ADMIN ? query.centerId : actor.centerId;
    const where: Prisma.UserWhereInput = {
      ...(query.role && { role: query.role }),
      ...(centerId && { centerId }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { username: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: SAFE_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page, pages: Math.ceil(total / limit) };
  }

  async get(actor: AuthUser, id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: SAFE_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');
    this.assertCanManage(actor, user.role, user.centerId);
    return user;
  }

  async update(actor: AuthUser, id: string, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User not found');
    const isSelf = actor.id === id;
    if (isSelf) {
      // anyone may edit their own profile fields (not role/state)
      const { name, email, phone, avatarUrl, newPassword } = dto;
      return this.prisma.user.update({
        where: { id },
        data: {
          name,
          email,
          phone,
          avatarUrl,
          ...(newPassword && {
            passwordHash: await bcrypt.hash(newPassword, 12),
          }),
        },
        select: SAFE_SELECT,
      });
    }
    this.assertCanManage(actor, existing.role, existing.centerId);

    if (dto.email && dto.email !== existing.email) {
      const clash = await this.prisma.user.findUnique({
        where: { email: dto.email },
        select: { id: true },
      });
      if (clash) throw new ConflictException('Email already in use');
    }

    const { newPassword, ...data } = dto;
    return this.prisma.user.update({
      where: { id },
      data: {
        ...data,
        ...(newPassword && { passwordHash: await bcrypt.hash(newPassword, 12) }),
      },
      select: SAFE_SELECT,
    });
  }

  /** Soft delete — keeps history, blocks login. */
  async deactivate(actor: AuthUser, id: string) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User not found');
    this.assertCanManage(actor, existing.role, existing.centerId);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id }, data: { isActive: false } }),
      this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { success: true };
  }
}
