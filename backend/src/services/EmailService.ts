import nodemailer from 'nodemailer';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    if (config.email.host && config.email.user) {
      this.transporter = nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.port === 465,
        auth: {
          user: config.email.user,
          pass: config.email.pass,
        },
      });
      logger.info('Email service initialized');
    } else {
      logger.warn('SMTP not configured — emails will be logged only');
    }
  }

  async sendWelcomeEmail(to: string, displayName: string): Promise<void> {
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <h1 style="color: #2563eb; font-size: 24px; margin-bottom: 8px;">Welcome aboard, ${displayName}!</h1>
        <p style="color: #475569; font-size: 16px; line-height: 1.5;">
          You're officially registered for <strong>Nick's Vegas Bachelor Party</strong> — April 3-5, 2026.
        </p>
        <p style="color: #475569; font-size: 16px; line-height: 1.5;">
          Open the app to check the schedule, RSVP to events, and see what you owe.
        </p>
        <a href="${config.frontendUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">Open BachBoys</a>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 32px;">
          Pro tip: Add the app to your home screen for the best experience.
        </p>
      </div>
    `;

    await this.send(to, "You're in — Nick's Bach Party", html);
  }

  async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    const resetUrl = `${config.frontendUrl}/reset-password?token=${resetToken}`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <h1 style="color: #2563eb; font-size: 24px; margin-bottom: 8px;">Reset your password</h1>
        <p style="color: #475569; font-size: 16px; line-height: 1.5;">
          Someone requested a password reset for your BachBoys account. If this was you, click below:
        </p>
        <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">Reset Password</a>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 32px;">
          This link expires in 1 hour. If you didn't request this, you can safely ignore it.
        </p>
      </div>
    `;

    await this.send(to, 'Reset your BachBoys password', html);
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) {
      logger.info(`[Email] Would send to ${to}: "${subject}"`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: config.email.from,
        to,
        subject,
        html,
      });
      logger.info(`Email sent to ${to}: "${subject}"`);
    } catch (error) {
      logger.error(`Failed to send email to ${to}:`, error);
    }
  }
}

export const emailService = new EmailService();
