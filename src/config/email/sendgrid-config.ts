// src/config/email/sendgrid-config.ts
import 'dotenv/config';
import * as sgMail from '@sendgrid/mail';

const { SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, SENDGRID_FROM_NAME } = process.env;

if (!SENDGRID_API_KEY || !SENDGRID_FROM_EMAIL) {
  throw new Error(
    'Missing SendGrid environment variables: SENDGRID_API_KEY and SENDGRID_FROM_EMAIL are required',
  );
}

// Set API key
sgMail.setApiKey(SENDGRID_API_KEY);

export const sendGridClient = sgMail;

export const sendGridSender = {
  email: SENDGRID_FROM_EMAIL,
  name: SENDGRID_FROM_NAME ?? 'Street2School',
};