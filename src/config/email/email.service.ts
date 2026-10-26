// src/config/email/email.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import * as sgMail from '@sendgrid/mail';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly frontendUrl: string;
  private readonly supportEmail: string;
  private getCurrentYear(): number {
    return new Date().getFullYear();
  }
  constructor(private configService: ConfigService) {
    // Initialize SendGrid with API key from environment
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    if (!apiKey) {
      this.logger.error('SENDGRID_API_KEY not found in environment variables');
      throw new Error('SendGrid API key is required');
    }
    sgMail.setApiKey(apiKey);

    // Set sender details
    this.fromEmail =
      this.configService.get<string>('SENDGRID_FROM_EMAIL') ||
      'noreply@streettoschool.com';
    this.fromName =
      this.configService.get<string>('SENDGRID_FROM_NAME') ||
      'Street To School';

    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      'https://streettoschool.com';
    this.supportEmail =
      this.configService.get<string>('SUPPORT_EMAIL') ||
      'support@streettoschool.com';
    this.logger.log('SendGrid email service initialized');
  }

  // ─── TEMPLATE LOADER ─────────────────────────────────────────────────────

  private async loadTemplate(templateName: string): Promise<string> {
    const possiblePaths = [
      path.resolve(
        process.cwd(),
        'src/config/email/email-templates',
        `${templateName}.html`,
      ),
      path.resolve(
        process.cwd(),
        'dist/config/email/email-templates',
        `${templateName}.html`,
      ),
    ];

    for (const p of possiblePaths) {
      try {
        await fs.promises.access(p, fs.constants.F_OK);
        const content = await fs.promises.readFile(p, 'utf8');
        if (!content.trim())
          throw new Error(`Template "${templateName}" is empty`);
        return content;
      } catch {
        // try next path
      }
    }

    throw new Error(
      `Template "${templateName}" not found in src/ or dist/. Looked in:\n` +
        possiblePaths.join('\n'),
    );
  }

  private fillPlaceholders(
    template: string,
    placeholders: Record<string, string>,
  ): string {
    return Object.entries(placeholders).reduce((html, [key, value]) => {
      return html.replace(new RegExp(`{{${key}}}`, 'g'), value ?? '');
    }, template);
  }

  private async send(
    to: string,
    subject: string,
    templateName: string,
    placeholders: Record<string, string>,
    recipientName?: string,
  ): Promise<void> {
    try {
      const template = await this.loadTemplate(templateName);

      const allPlaceholders = {
        ...placeholders,
        frontendUrl: this.frontendUrl,
        loginUrl: `${this.frontendUrl}/login`,
        forgotPasswordUrl: `${this.frontendUrl}/forgot-password`,
        supportEmail: this.supportEmail,
        currentYear: new Date().getFullYear().toString(),
      };
      const html = this.fillPlaceholders(template, allPlaceholders);

      const msg = {
        to: {
          email: to,
          name: recipientName ?? '',
        },
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject: subject,
        html: html,
      };

      await sgMail.send(msg);

      this.logger.log(`[${templateName}] Email sent to ${to}`);
    } catch (error: any) {
      const details = error?.response?.body ?? error?.message ?? error;
      this.logger.error(`[${templateName}] Failed to send to ${to}`, details);
      // Intentionally not re-throwing — email failure should not break the main flow
    }
  }

  // ─── AUTH EMAILS ──────────────────────────────────────────────────────────

  async sendWelcomeEmail(params: {
    to: string;
    firstName: string;
    tempPassword: string;
    role: string;
    organizationName: string;
  }): Promise<void> {
    await this.send(
      params.to,
      'Welcome to Street To School – Your Account Details',
      'welcome',
      {
        firstName: params.firstName,
        email: params.to,
        tempPassword: params.tempPassword,
        role: params.role,
        organizationName: params.organizationName,
      },
      params.firstName,
    );
  }

  async sendPasswordResetOtp(params: {
    to: string;
    firstName: string;
    otp: string;
  }): Promise<void> {
    await this.send(
      params.to,
      'Street To School – Password Reset Code',
      'password-reset',
      {
        firstName: params.firstName,
        otp: params.otp,
      },
      params.firstName,
    );
  }

  // ─── ORGANIZATION EMAILS ──────────────────────────────────────────────────

  async sendOrganizationApprovedEmail(params: {
    to: string;
    contactName: string;
    organizationName: string;
  }): Promise<void> {
    await this.send(
      params.to,
      'Your Organization Has Been Approved – Street To School',
      'organization-approved',
      {
        contactName: params.contactName,
        organizationName: params.organizationName,
      },
      params.contactName,
    );
  }

  async sendOrganizationSuspendedEmail(params: {
    to: string;
    contactName: string;
    organizationName: string;
    reason?: string;
  }): Promise<void> {
    await this.send(
      params.to,
      'Important: Your Organization Account Has Been Suspended',
      'organization-suspended',
      {
        contactName: params.contactName,
        organizationName: params.organizationName,
        reason: params.reason ?? 'Please contact support for details.',
      },
      params.contactName,
    );
  }

  async sendOrganizationCreatedEmail(params: {
    to: string;
    contactName: string;
    organizationName: string;
  }): Promise<void> {
    await this.send(
      params.to,
      'Organization Registration Received – Street To School',
      'organization-created',
      {
        contactName: params.contactName,
        organizationName: params.organizationName,
      },
      params.contactName,
    );
  }

  // Password reset confirmation (after successful reset)
  async sendPasswordResetConfirmationEmail(params: {
    to: string;
    firstName: string;
  }): Promise<void> {
    await this.send(
      params.to,
      'Password Reset Successful – Street To School',
      'password-reset-confirmation',
      {
        firstName: params.firstName,
      },
      params.firstName,
    );
  }

  // Password changed notification (via profile)
  async sendPasswordChangedEmail(params: {
    to: string;
    firstName: string;
  }): Promise<void> {
    await this.send(
      params.to,
      'Password Changed Successfully – Street To School',
      'password-changed',
      {
        firstName: params.firstName,
      },
      params.firstName,
    );
  }
  // ─── SCHOOL EMAILS ────────────────────────────────────────────────────────

  async sendSchoolActivatedEmail(params: {
    to: string;
    firstName: string;
    schoolName: string;
    organizationName: string;
  }): Promise<void> {
    await this.send(
      params.to,
      `${params.schoolName} Has Been Activated – Street To School`,
      'school-activated',
      {
        firstName: params.firstName,
        schoolName: params.schoolName,
        organizationName: params.organizationName,
      },
      params.firstName,
    );
  }

  async sendSchoolDeactivatedEmail(params: {
    to: string;
    firstName: string;
    schoolName: string;
    organizationName: string;
    reason?: string;
  }): Promise<void> {
    await this.send(
      params.to,
      `Important: ${params.schoolName} Has Been Deactivated`,
      'school-deactivated',
      {
        firstName: params.firstName,
        schoolName: params.schoolName,
        organizationName: params.organizationName,
        reason:
          params.reason ??
          'Please contact your organization administrator for details.',
      },
      params.firstName,
    );
  }
}
