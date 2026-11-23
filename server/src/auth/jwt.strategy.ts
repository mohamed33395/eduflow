import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

interface JwtPayload {
  sub: string;
  role: string;
}

/** Short cache TTL — keeps account disabling effective within seconds
 *  while avoiding a DB round-trip on every single authenticated request. */
const AUTH_CACHE_TTL_MS = 30_000;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly cache = new Map<string, { user: AuthUser; at: number }>();

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const cached = this.cache.get(payload.sub);
    if (cached && Date.now() - cached.at < AUTH_CACHE_TTL_MS) {
      return cached.user;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        centerId: true,
        courseId: true,
        isActive: true,
      },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account disabled or not found');
    }
    const { isActive: _isActive, ...authUser } = user;
    this.cache.set(payload.sub, { user: authUser, at: Date.now() });
    return authUser;
  }
}
