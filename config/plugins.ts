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
      // Don't crush originals on upload (was causing soft/pixelated case & hero photos).
      // Prefer sources ≥400px high (≈800px for sharp retina). Responsive widths stay generous.
      sizeOptimization: false,
      responsiveDimensions: true,
      breakpoints: {
        large: 1600,
        medium: 1000,
        small: 600,
      },
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
        defaultFrom: env('SMTP_DEFAULT_FROM', 'noreply@merkdraak.nl'),
        defaultReplyTo: env('SMTP_DEFAULT_REPLY_TO', 'info@merkdraak.nl'),
      },
    },
  },
});

export default config;
