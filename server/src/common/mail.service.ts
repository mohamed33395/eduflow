import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * Thin SMTP mailer. If SMTP_* env vars are missing the service is a no-op:
 * sendPasswordResetOtp() returns false and logs the code so dev flows still work.
 *
 * Gmail: use an App Password (Google Account → Security → App passwords),
 * SMTP_HOST=smtp.gmail.com SMTP_PORT=465 SMTP_SECURE=true.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter | null = null;
  private readonly from: string = '';

  constructor(private readonly config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    const user = config.get<string>('SMTP_USER');
    const pass = config.get<string>('SMTP_PASS');
    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(config.get<string>('SMTP_PORT', '587')),
        secure: config.get<string>('SMTP_SECURE', 'false') === 'true',
        auth: { user, pass },
      });
      this.from = config.get<string>('SMTP_FROM', `"EduFlow" <${user}>`);
    }
  }

  get isConfigured(): boolean {
    return this.transporter !== null;
  }

  /** Sends the 6-digit password-reset code. Returns false when SMTP is absent/failed. */
  async sendPasswordResetOtp(to: string, otp: string): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(`SMTP not configured — reset OTP for ${to} is ${otp}`);
      return false;
    }
    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject: 'EduFlow — Password reset code',
        text: `Your EduFlow password reset code is ${otp}. It expires in 10 minutes. If you did not request this, ignore this email.`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px">
            <h2 style="color:#4f46e5;margin:0 0 12px">EduFlow</h2>
            <p>Your password reset code is:</p>
            <p style="font-size:32px;font-weight:bold;letter-spacing:6px;margin:16px 0">${otp}</p>
            <p style="color:#64748b;font-size:13px">
              The code expires in 10 minutes. If you did not request a password reset, you can ignore this email.
            </p>
          </div>`,
      });
      return true;
    } catch (err) {
      this.logger.error(`Failed to send reset OTP to ${to}`, err);
      return false;
    }
  }
}
