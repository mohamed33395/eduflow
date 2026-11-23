import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { MailService } from '../common/mail.service';
import { MultiStageAuthController } from './multi-stage-auth.controller';
import { MultiStageAuthService } from './multi-stage-auth.service';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController, MultiStageAuthController],
  providers: [AuthService, JwtStrategy, MailService, MultiStageAuthService],
  exports: [AuthService],
})
export class AuthModule {}
