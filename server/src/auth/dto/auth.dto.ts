import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LoginDto {
  /** Username or email */
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  identifier!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password!: string;
}

export class SetupSuperAdminDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message: 'username may only contain letters, numbers, dot, dash, underscore',
  })
  username!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(6)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  newPassword!: string;
}

export class ForgotPasswordDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  identifier!: string;
}

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  newPassword!: string;
}
