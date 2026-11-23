import {
  IsEmail,
  IsOptional,
  IsString,
  IsIn,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class GetLoginWaysDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  identifier!: string;
}

export class LoginStepDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  identifier!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  password!: string; // Can be actual password or OTP

  @IsString()
  token!: string; // Current step token
}

export class AlternativeStepLoginDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  identifier!: string;

  @IsIn(['mail', 'sms', 'password', 'social'])
  loginOption!: string;

  @IsString()
  token!: string; // Current step token
}

export class ResendOtpDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  identifier!: string;

  @IsString()
  token!: string; // Current step token
}

export class ValidateResetPasswordOtpDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  identifier!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(6)
  @Matches(/^\d+$/, { message: 'OTP must be numeric' })
  otp!: string;
}

export class ResetPasswordWithTokenDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  identifier!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/, {
    message: 'Password must be at least 8 characters with 1 uppercase and 1 special character',
  })
  password!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  passwordConfirmation!: string;

  @IsString()
  token!: string; // Verified reset token
}

// Response types
export interface LoginWaysResponse {
  code: string;
  message: string | null;
  payload: {
    token: string;
    login_way: {
      id: string;
      name: string;
      step: {
        login_option: 'password' | 'otp';
        login_option_alternatives: string[] | null;
      } | null;
      by: string;
      type: 'mail' | 'sms';
    };
    can_set_pass: number;
    first_login: number;
  };
}

export interface LoginStepResponse {
  code: string;
  message: string | null;
  payload: {
    token?: string;
    accessToken?: string;
    login_way?: {
      id: string;
      name: string;
      step: {
        login_option: 'password' | 'otp';
        login_option_alternatives: string[] | null;
      } | null;
      by: string;
      type: 'mail' | 'sms';
    };
    user?: {
      id: string;
      name: string;
      email: string | null;
      role?: string;
      is_super_admin: boolean;
      user_types?: string[];
    };
  };
}
