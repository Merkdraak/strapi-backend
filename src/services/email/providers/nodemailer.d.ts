declare module "nodemailer" {
  interface TransportOptions {
    host?: string;
    port?: number;
    secure?: boolean;
    auth?: { user?: string; pass?: string };
  }

  interface Transporter {
    sendMail(options: {
      from?: string;
      to?: string;
      subject?: string;
      text?: string;
      html?: string;
      replyTo?: string;
    }): Promise<unknown>;
  }

  const nodemailer: {
    createTransport(options: TransportOptions): Transporter;
  };

  export default nodemailer;
}
