import type { Core } from '@strapi/strapi';

const allowedMediaTypes = [
  'image/*',
  'video/*',
  'audio/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.*',
  'text/plain',
  'text/csv',
];

const deniedTypes = [
  'image/svg+xml',
  'application/vnd.microsoft.portable-executable',
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-executable',
  'application/x-dosexec',
  'application/x-sh',
  'text/x-shellscript',
  'application/x-mach-binary',
];

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
  'users-permissions': {
    config: {
      jwtManagement: 'refresh',
      sessions: {
        httpOnly: true,
      },
    },
  },
  upload: {
    config: {
      // Keep responsive formats + mild compression; prefer uploading sources ≥1600px wide for cases/heroes.
      sizeOptimization: true,
      responsiveDimensions: true,
      security: {
        allowedTypes: allowedMediaTypes,
        deniedTypes,
      },
    },
  },
  email: {
    config: {
      // Local/dev: built-in sendmail. Set SMTP_* and install @strapi/provider-email-nodemailer for SMTP.
      provider: env('SMTP_HOST') ? 'nodemailer' : 'sendmail',
      providerOptions: env('SMTP_HOST')
        ? {
            host: env('SMTP_HOST'),
            port: env.int('SMTP_PORT', 587),
            secure: env.bool('SMTP_SECURE', false),
            auth: {
              user: env('SMTP_USERNAME'),
              pass: env('SMTP_PASSWORD'),
            },
          }
        : {},
      settings: {
        defaultFrom: env('SMTP_DEFAULT_FROM', 'beheer@merkdraak.nl'),
        defaultReplyTo: env('SMTP_DEFAULT_REPLY_TO', 'beheer@merkdraak.nl'),
      },
    },
  },
});

export default config;
