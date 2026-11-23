import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../common/mail.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import {
  GetLoginWaysDto,
  LoginStepDto,
  AlternativeStepLoginDto,
  ResendOtpDto,
  ValidateResetPasswordOtpDto,
  ResetPasswordWithTokenDto,
  LoginWaysResponse,
  LoginStepResponse,
} from './dto/multi-stage-auth.dto';

const STEP_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_OTP_ATTEMPTS = 5;

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** 5-digit numeric OTP for compatibility with Constrix UI */
function generateOtp(): string {
  return String(randomBytes(4).readUInt32BE(0) % 100_000).padStart(5, '0');
}

/** Generate a random step token */
function generateStepToken(): string {
  return randomBytes(32).toString('base64url');
}

@Injectable()
export class MultiStageAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  /**
   * Step 1: Discover available login methods for an identifier
   * Returns a step token and the available login options
   */
  async getLoginWays(dto: GetLoginWaysDto): Promise<LoginWaysResponse> {
    const ident = dto.identifier.trim();
    
    // Find user by email, username, or phone
    const user = await this.findUserByIdentifier(ident);
    
    // Always return success to prevent user enumeration
    // But if user exists, create a step token
    let token: string;
    let canSetPass = 0;
    let firstLogin = 0;
    let loginOption: 'password' | 'otp' = 'password';
    let loginType: 'mail' | 'sms' = 'mail';
    let loginBy = '';

    if (user) {
      // Create a step token
      token = await this.createStepToken(user.id);
      
      // Determine login method based on user state
      if (!user.passwordHash || user.passwordHash === '') {
        // User has no password set - must use OTP
        loginOption = 'otp';
        canSetPass = 1;
        firstLogin = 1;
      } else {
        // User has password - can use password or OTP
        loginOption = 'password';
        canSetPass = 0;
        firstLogin = 0;
      }
      
      // Determine channel (email or SMS)
      if (user.email) {
        loginType = 'mail';
        loginBy = user.email;
      } else if (user.phone) {
        loginType = 'sms';
        loginBy = user.phone;
      } else {
        loginBy = user.username;
      }
    } else {
      // User doesn't exist - create anonymous step token
      token = await this.createStepToken(null);
      loginOption = 'password';
      loginType = 'mail';
      loginBy = ident;
    }

    return {
      code: 'SUCCESS_WITH_SINGLE_PAYLOAD_OBJECT',
      message: null,
      payload: {
        token,
        login_way: {
          id: '1',
          name: loginOption === 'password' ? 'Password Login' : 'OTP Login',
          step: {
            login_option: loginOption,
            login_option_alternatives: ['mail', 'sms', 'password'],
          },
          by: loginBy,
          type: loginType,
        },
        can_set_pass: canSetPass,
        first_login: firstLogin,
      },
    };
  }

  /**
   * Step 2: Execute a login step (password or OTP)
   * Returns next step token or final user data on completion
   */
  async loginStep(
    dto: LoginStepDto,
  ): Promise<{
    body: LoginStepResponse;
    refreshToken?: string;
    refreshTtlMs?: number;
  }> {
    // Validate step token
    const stepToken = await this.validateStepToken(dto.token);
    if (!stepToken) {
      throw new UnauthorizedException('Invalid or expired step token');
    }

    // Find user
    const user = await this.findUserByIdentifier(dto.identifier);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Determine if this is a password or OTP step
    // For now, we'll check if the credential looks like an OTP (5 digits)
    const isOtp = /^\d{5}$/.test(dto.password);

    if (isOtp) {
      // Verify OTP
      const otpValid = await this.verifyOtp(dto.password, user.id, stepToken.id);
      if (!otpValid) {
        throw new UnauthorizedException('Invalid OTP');
      }
      
      // OTP verified - mark step as consumed and issue final tokens
      await this.consumeStepToken(stepToken.id);
      return this.issueFinalResponse(user);
    } else {
      // Verify password
      const bcrypt = require('bcryptjs');
      const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
      if (!passwordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }
      
      // Password verified - mark step as consumed and issue final tokens
      await this.consumeStepToken(stepToken.id);
      return this.issueFinalResponse(user);
    }
  }

  /**
   * Switch to an alternative login method (e.g., from password to OTP)
   */
  async alternativeStepLogin(dto: AlternativeStepLoginDto): Promise<LoginStepResponse> {
    // Validate step token
    const stepToken = await this.validateStepToken(dto.token);
    if (!stepToken) {
      throw new UnauthorizedException('Invalid or expired step token');
    }

    // Find user
    const user = await this.findUserByIdentifier(dto.identifier);
    if (!user) {
      // Return same token for non-existent user (prevents enumeration)
      return {
        code: 'SUCCESS_WITH_SINGLE_PAYLOAD_OBJECT',
        message: null,
        payload: {
          token: dto.token,
          login_way: {
            id: '1',
            name: 'Alternative Login',
            step: {
              login_option: dto.loginOption as any,
              login_option_alternatives: ['mail', 'sms', 'password'],
            },
            by: dto.identifier,
            type: dto.loginOption === 'mail' ? 'mail' : 'sms',
          },
        },
      };
    }

    // Generate and send OTP if switching to OTP
    if (dto.loginOption === 'mail' || dto.loginOption === 'sms') {
      const otp = generateOtp();
      await this.createOtpRecord(otp, user.id, stepToken.id, dto.loginOption);
      
      // Send OTP via email
      if (dto.loginOption === 'mail' && user.email) {
        await this.mail.sendPasswordResetOtp(user.email, otp);
      }
      // SMS would be implemented here with a SMS service
    }

    return {
      code: 'SUCCESS_WITH_SINGLE_PAYLOAD_OBJECT',
      message: null,
      payload: {
        token: dto.token,
        login_way: {
          id: '1',
          name: 'Alternative Login',
          step: {
            login_option: dto.loginOption as any,
            login_option_alternatives: ['mail', 'sms', 'password'],
          },
          by: dto.loginOption === 'mail' ? (user.email || dto.identifier) : (user.phone || dto.identifier),
          type: dto.loginOption as any,
        },
      },
    };
  }

  /**
   * Resend OTP for the current login step
   */
  async resendOtp(dto: ResendOtpDto): Promise<{ success: boolean }> {
    // Validate step token
    const stepToken = await this.validateStepToken(dto.token);
    if (!stepToken) {
      throw new UnauthorizedException('Invalid or expired step token');
    }

    // Find user
    const user = await this.findUserByIdentifier(dto.identifier);
    if (!user) {
      return { success: true }; // Prevent enumeration
    }

    // Generate new OTP
    const otp = generateOtp();
    await this.createOtpRecord(otp, user.id, stepToken.id, 'mail');
    
    // Send OTP
    if (user.email) {
      await this.mail.sendPasswordResetOtp(user.email, otp);
    }

    return { success: true };
  }

  /**
   * Validate OTP for password reset
   * Note: This endpoint does NOT require a token in the body (per Constrix spec)
   */
  async validateResetPasswordOtp(dto: ValidateResetPasswordOtpDto): Promise<{ token: string }> {
    // Find user
    const user = await this.findUserByIdentifier(dto.identifier);
    if (!user) {
      throw new UnauthorizedException('Invalid identifier');
    }

    // Find valid OTP for this user
    const otpRecord = await this.prisma.$queryRaw`
      SELECT * FROM login_otps
      WHERE token_hash = ${sha256(dto.otp)}
      AND user_id = ${user.id}
      AND used_at IS NULL
      AND expires_at > NOW()
      AND attempts < ${MAX_OTP_ATTEMPTS}
      LIMIT 1
    ` as any[];

    if (!otpRecord || otpRecord.length === 0) {
      // Increment attempts
      await this.prisma.$queryRaw`
        UPDATE login_otps
        SET attempts = attempts + 1
        WHERE token_hash = ${sha256(dto.otp)}
        AND user_id = ${user.id}
      `;
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // Mark OTP as used
    await this.prisma.$queryRaw`
      UPDATE login_otps
      SET used_at = NOW()
      WHERE id = ${otpRecord[0].id}
    `;

    // Generate a reset token
    const resetToken = generateStepToken();
    const resetTokenHash = sha256(resetToken);
    
    // Store reset token (using password_reset_tokens table for compatibility)
    await this.prisma.passwordResetToken.create({
      data: {
        tokenHash: resetTokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + STEP_TOKEN_TTL_MS),
      },
    });

    return { token: resetToken };
  }

  /**
   * Reset password using verified token
   */
  async resetPasswordWithToken(dto: ResetPasswordWithTokenDto): Promise<{ success: boolean }> {
    // Validate password confirmation
    if (dto.password !== dto.passwordConfirmation) {
      throw new ConflictException('Passwords do not match');
    }

    // Validate reset token
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: sha256(dto.token) },
      include: { user: true },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    // Hash new password
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Update user password and mark token as used
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      // Revoke all refresh tokens
      this.prisma.refreshToken.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { success: true };
  }

  // ── Helper methods ───────────────────────────────────────────────

  private async findUserByIdentifier(identifier: string) {
    const digits = identifier.replace(/\D/g, '');
    return this.prisma.user.findFirst({
      where: {
        OR: [
          { username: identifier },
          { email: identifier },
          { phone: identifier },
          ...(digits.length >= 7 ? [{ phone: { endsWith: digits.slice(-9) } }] : []),
        ],
      },
    });
  }

  private async createStepToken(userId: string | null): Promise<string> {
    const token = generateStepToken();
    const tokenHash = sha256(token);
    
    // Using raw SQL for now since Prisma schema doesn't have the model yet
    await this.prisma.$queryRaw`
      INSERT INTO login_step_tokens (id, token_hash, user_id, expires_at, created_at)
      VALUES (gen_random_uuid(), ${tokenHash}, ${userId}, NOW() + INTERVAL '15 minutes', NOW())
    `;
    
    return token;
  }

  private async validateStepToken(token: string) {
    const tokenHash = sha256(token);
    const result = await this.prisma.$queryRaw`
      SELECT * FROM login_step_tokens
      WHERE token_hash = ${tokenHash}
      AND consumed_at IS NULL
      AND expires_at > NOW()
      LIMIT 1
    ` as any[];
    
    return result.length > 0 ? result[0] : null;
  }

  private async consumeStepToken(stepTokenId: string) {
    await this.prisma.$queryRaw`
      UPDATE login_step_tokens
      SET consumed_at = NOW()
      WHERE id = ${stepTokenId}
    `;
  }

  private async createOtpRecord(otp: string, userId: string, stepTokenId: string, channel: string) {
    const tokenHash = sha256(otp);
    
    await this.prisma.$queryRaw`
      INSERT INTO login_otps (id, token_hash, step_token_id, user_id, channel, expires_at, attempts, created_at)
      VALUES (gen_random_uuid(), ${tokenHash}, ${stepTokenId}, ${userId}, ${channel}, NOW() + INTERVAL '10 minutes', 0, NOW())
    `;
  }

  private async verifyOtp(otp: string, userId: string, stepTokenId: string): Promise<boolean> {
    const tokenHash = sha256(otp);
    const result = await this.prisma.$queryRaw`
      SELECT * FROM login_otps
      WHERE token_hash = ${tokenHash}
      AND user_id = ${userId}
      AND step_token_id = ${stepTokenId}
      AND used_at IS NULL
      AND expires_at > NOW()
      AND attempts < ${MAX_OTP_ATTEMPTS}
      LIMIT 1
    ` as any[];
    
    if (result.length === 0) {
      // Increment attempts
      await this.prisma.$queryRaw`
        UPDATE login_otps
        SET attempts = attempts + 1
        WHERE token_hash = ${tokenHash}
        AND user_id = ${userId}
      `;
      return false;
    }

    // Mark OTP as used
    await this.prisma.$queryRaw`
      UPDATE login_otps
      SET used_at = NOW()
      WHERE id = ${result[0].id}
    `;

    return true;
  }

  private async issueFinalResponse(
    user: any,
  ): Promise<{
    body: LoginStepResponse;
    refreshToken: string;
    refreshTtlMs: number;
  }> {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, role: user.role },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: '15m',
      },
    );

    // Create refresh token
    const refreshToken = randomBytes(48).toString('base64url');
    const refreshTtlMs = 30 * 24 * 60 * 60 * 1000; // 30 days
    
    await this.prisma.refreshToken.create({
      data: {
        tokenHash: sha256(refreshToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + refreshTtlMs),
      },
    });

    return {
      refreshToken,
      refreshTtlMs,
      body: {
        code: 'SUCCESS_WITH_SINGLE_PAYLOAD_OBJECT',
        message: null,
        payload: {
          accessToken,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            is_super_admin: user.role === 'SUPER_ADMIN',
            user_types: [user.role],
          },
        },
      },
    };
  }
}
