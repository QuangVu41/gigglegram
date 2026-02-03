import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async sendWelcomeEmail({ user }: { user: { email: string; name: string } }) {
    await this.mailerService.sendMail({
      to: user.email,
      from: `Welcome <no-reply@gigglegram.com>`,
      subject: 'Welcome to GiggleGram',
      template: './welcome-email',
      context: {
        email: user.email,
        name: user.name,
        homeUrl: this.configService.getOrThrow<string>('WEB_URL'),
      },
    });
  }

  async sendPasswordResetEmail({
    user,
    url,
  }: {
    user: { email: string; name: string };
    url?: string;
  }) {
    await this.mailerService.sendMail({
      to: user.email,
      from: `Password Reset <no-reply@gigglegram.com>`,
      subject: 'Password Reset',
      template: './password-reset',
      context: {
        email: user.email,
        passwordResetUrl: url,
      },
    });
  }

  async sendVerificationEmail({
    user,
    url,
  }: {
    user: { email: string; name: string };
    url?: string;
  }) {
    await this.mailerService.sendMail({
      to: user.email,
      from: `Email Verification <no-reply@gigglegram.com>`,
      subject: 'Email Verification',
      template: './email-verification',
      context: {
        email: user.email,
        verificationUrl: url,
      },
    });
  }
}
