import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../common/mail.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  ResetPasswordDto,
  SetupSuperAdminDto,
} from './dto/auth.dto';

const REFRESH_COOKIE_TTL_FALLBACK_MS = 30 * 24 * 60 * 60 * 1000; // 30d
const OTP_TTL_MS = 10 * 60 * 1000; // 10m

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

/** 6-digit numeric OTP, zero-padded. */
function generateOtp(): string {
  return String(randomBytes(4).readUInt32BE(0) % 1_000_000).padStart(6, '0');
}

/** Parses '15m', '30d', '12h', '60s' into milliseconds. */
export function parseTtl(ttl: string, fallbackMs: number): number {
  const match = /^(\d+)([smhd])$/.exec(ttl.trim());
  if (!match) return fallbackMs;
  const value = Number(match[1]);
  const unit = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }[
    match[2] as 's' | 'm' | 'h' | 'd'
  ];
  return value * unit;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  // ── Login / tokens ──────────────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: dto.identifier }, { email: dto.identifier }],
      },
    });
    if (
      !user ||
      !user.isActive ||
      !(await bcrypt.compare(dto.password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.issueTokens(user);
  }
  async refresh(refreshToken: string | undefined, rotate = true) {
    if (!refreshToken) throw new UnauthorizedException('Missing refresh token');
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(refreshToken) },
      include: { user: true },
    });
    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt < new Date() ||
      !stored.user.isActive
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (!rotate) {
      // Non-rotating refresh (server-side rendering): keep the stored token
      // valid so the browser's copy is not invalidated.
      return {
        accessToken: await this.signAccessToken(stored.user),
        refreshToken: undefined,
        refreshTtlMs: 0,
        user: this.toAuthUser(stored.user),
      };
    }
    // rotate: revoke old, issue new
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(stored.user);
  }

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async signAccessToken(user: User) {
    return this.jwt.signAsync(
      { sub: user.id, role: user.role },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>(
          'JWT_ACCESS_TTL',
          '15m',
        ) as StringValue,
      },
    );
  }

  private async issueTokens(user: User) {
    const accessToken = await this.signAccessToken(user);

    const refreshToken = randomBytes(48).toString('base64url');
    const refreshTtlMs = parseTtl(
      this.config.get<string>('JWT_REFRESH_TTL', '30d'),
      REFRESH_COOKIE_TTL_FALLBACK_MS,
    );
    await this.prisma.refreshToken.create({
      data: {
        tokenHash: sha256(refreshToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + refreshTtlMs),
      },
    });

    return {
      accessToken,
      refreshToken,
      refreshTtlMs,
      user: this.toAuthUser(user),
    };
  }

  private toAuthUser(user: User): AuthUser & { email: string | null } {
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.role,
      centerId: user.centerId,
      courseId: user.courseId,
      createdAt: user.createdAt.toISOString(),
    } as AuthUser & { email: string | null };
  }

  // ── Password management ─────────────────────────────────────────

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(dto.newPassword, 12) },
    });
    await this.revokeAllSessions(userId);
    return { success: true };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const ident = dto.identifier.trim();
    const digits = ident.replace(/\D/g, '');
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: ident },
          { email: ident },
          { phone: ident },
          ...(digits.length >= 7 ? [{ phone: { endsWith: digits.slice(-9) } }] : []),
        ],
      },
    });
    // Never reveal whether the account exists
    if (!user) return { success: true };

    // 6-digit OTP; retry on the (astronomically unlikely) hash collision.
    let otp = generateOtp();
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await this.prisma.passwordResetToken.create({
          data: {
            tokenHash: sha256(otp),
            userId: user.id,
            expiresAt: new Date(Date.now() + OTP_TTL_MS),
          },
        });
        break;
      } catch {
        if (attempt === 4) throw new Error('Could not issue reset code');
        otp = generateOtp();
      }
    }

    const emailed = user.email
      ? await this.mail.sendPasswordResetOtp(user.email, otp)
      : false;

    // Without SMTP (or email on the account) surface the code only in dev.
    if (!emailed && process.env.NODE_ENV !== 'production') {
      return { success: true, devResetToken: otp };
    }
    return { success: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const stored = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: sha256(dto.token) },
    });
    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: stored.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: stored.userId },
        data: { passwordHash: await bcrypt.hash(dto.newPassword, 12) },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { success: true };
  }

  // ── Bootstrap ───────────────────────────────────────────────────

  async setupSuperAdmin(dto: SetupSuperAdminDto) {
    const exists = await this.prisma.user.count({
      where: { role: Role.SUPER_ADMIN },
    });
    if (exists > 0) {
      throw new ConflictException('Super admin already exists');
    }
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        username: dto.username,
        email: dto.email,
        passwordHash: await bcrypt.hash(dto.password, 12),
        role: Role.SUPER_ADMIN,
      },
    });
    return this.toAuthUser(user);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    return this.toAuthUser(user);
  }

  private async revokeAllSessions(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
