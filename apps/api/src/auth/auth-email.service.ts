import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import nodemailer from 'nodemailer';
import authConfig from './config/auth.config';

type AuthEmailPayload = {
  to: string;
  username: string;
  token: string;
};

@Injectable()
export class AuthEmailService {
  private readonly logger = new Logger(AuthEmailService.name);

  constructor(
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
  ) {}

  get isConfigured() {
    return Boolean(
      this.config.mail.host && this.config.mail.user && this.config.mail.pass,
    );
  }

  private get canLogSensitiveLinks() {
    return process.env.NODE_ENV !== 'production';
  }

  async sendVerificationEmail(payload: AuthEmailPayload) {
    const url = this.buildUrl('/verify-email', payload.token);
    return this.sendAuthEmail({
      to: payload.to,
      subject: 'Verify your Suzi Chat email',
      text: `Hi ${payload.username}, verify your Suzi Chat email here: ${url}`,
      html: this.renderEmail({
        title: 'Verify your email',
        body: `Hi ${payload.username}, confirm this email address to finish setting up your Suzi Chat account.`,
        buttonText: 'Verify email',
        url,
      }),
      fallbackLog: `Email verification link for ${payload.to}: ${url}`,
    });
  }

  async sendPasswordResetEmail(payload: AuthEmailPayload) {
    const url = this.buildUrl('/reset-password', payload.token);
    return this.sendAuthEmail({
      to: payload.to,
      subject: 'Reset your Suzi Chat password',
      text: `Hi ${payload.username}, reset your Suzi Chat password here: ${url}`,
      html: this.renderEmail({
        title: 'Reset your password',
        body: `Hi ${payload.username}, use this secure link to choose a new password for your Suzi Chat account.`,
        buttonText: 'Reset password',
        url,
      }),
      fallbackLog: `Password reset link for ${payload.to}: ${url}`,
    });
  }

  private buildUrl(path: string, token: string) {
    const base = this.config.appBaseUrl.replace(/\/$/, '');
    return `${base}${path}?token=${encodeURIComponent(token)}`;
  }

  private async sendAuthEmail({
    to,
    subject,
    text,
    html,
    fallbackLog,
  }: {
    to: string;
    subject: string;
    text: string;
    html: string;
    fallbackLog: string;
  }): Promise<boolean> {
    if (!this.isConfigured) {
      this.logger.warn(
        this.canLogSensitiveLinks
          ? `SMTP is not configured. ${fallbackLog}`
          : `SMTP is not configured for ${to}. Auth email was not sent.`,
      );
      return false;
    }

    try {
      const transport = nodemailer.createTransport({
        host: this.config.mail.host,
        port: this.config.mail.port,
        secure: this.config.mail.secure,
        auth: {
          user: this.config.mail.user,
          pass: this.config.mail.pass,
        },
      });

      await transport.sendMail({
        from: this.config.mail.from,
        to,
        subject,
        text,
        html,
      });
      return true;
    } catch (error) {
      const details =
        error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      this.logger.error(
        this.canLogSensitiveLinks
          ? `SMTP send failed. ${fallbackLog}. ${details}`
          : `SMTP send failed for ${to}. ${details}`,
      );
      return false;
    }
  }

  private renderEmail({
    title,
    body,
    buttonText,
    url,
  }: {
    title: string;
    body: string;
    buttonText: string;
    url: string;
  }) {
    return `
      <div style="font-family:Arial,sans-serif;background:#f6f7fb;padding:32px">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;padding:28px;border:1px solid #e5e7eb">
          <p style="margin:0 0 8px;color:#7c3aed;font-weight:700;letter-spacing:0.12em;text-transform:uppercase">Suzi Chat</p>
          <h1 style="margin:0;color:#111827;font-size:26px">${title}</h1>
          <p style="margin:18px 0 24px;color:#4b5563;line-height:1.6">${body}</p>
          <a href="${url}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:700">${buttonText}</a>
          <p style="margin:24px 0 0;color:#6b7280;font-size:13px;line-height:1.5">If the button does not work, copy this link into your browser:<br>${url}</p>
        </div>
      </div>
    `;
  }
}
