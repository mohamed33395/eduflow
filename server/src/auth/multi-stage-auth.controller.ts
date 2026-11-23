import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { MultiStageAuthService } from './multi-stage-auth.service';
import { Public } from '../common/decorators/public.decorator';
import {
  GetLoginWaysDto,
  LoginStepDto,
  AlternativeStepLoginDto,
  ResendOtpDto,
  ValidateResetPasswordOtpDto,
  ResetPasswordWithTokenDto,
} from './dto/multi-stage-auth.dto';

const REFRESH_COOKIE = 'eduflow_refresh';

@Controller('auths')
export class MultiStageAuthController {
  constructor(private readonly multiStageAuth: MultiStageAuthService) {}

  /**
   * Discover available login methods for an identifier
   * POST /auths/get-login-ways
   */
  @Public()
  @Post('get-login-ways')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async getLoginWays(@Body() dto: GetLoginWaysDto) {
    return this.multiStageAuth.getLoginWays(dto);
  }

  /**
   * Execute a login step (password or OTP)
   * POST /auths/login-step
   */
  @Public()
  @Post('login-step')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async loginStep(
    @Body() dto: LoginStepDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { body, refreshToken, refreshTtlMs } =
      await this.multiStageAuth.loginStep(dto);
    if (refreshToken && refreshTtlMs) {
      res.cookie(REFRESH_COOKIE, refreshToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/api/auth',
        maxAge: refreshTtlMs,
      });
    }
    return body;
  }

  /**
   * Switch to an alternative login method
   * POST /auths/alternative-step-login
   */
  @Public()
  @Post('alternative-step-login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async alternativeStepLogin(@Body() dto: AlternativeStepLoginDto) {
    return this.multiStageAuth.alternativeStepLogin(dto);
  }

  /**
   * Resend OTP for the current login step
   * POST /auths/resend-otp
   */
  @Public()
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async resendOtp(@Body() dto: ResendOtpDto) {
    return this.multiStageAuth.resendOtp(dto);
  }

  /**
   * Validate OTP for password reset
   * POST /auths/validate-reset-password-otp
   */
  @Public()
  @Post('validate-reset-password-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async validateResetPasswordOtp(@Body() dto: ValidateResetPasswordOtpDto) {
    return this.multiStageAuth.validateResetPasswordOtp(dto);
  }

  /**
   * Reset password using verified token
   * POST /auths/reset-password-with-token
   */
  @Public()
  @Post('reset-password-with-token')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async resetPasswordWithToken(@Body() dto: ResetPasswordWithTokenDto) {
    return this.multiStageAuth.resetPasswordWithToken(dto);
  }
}
