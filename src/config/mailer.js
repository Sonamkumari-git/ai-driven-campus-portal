const nodemailer = require('nodemailer');
const { env } = require('./env');

let transporter = null;

function getTransporter() {
  if (!env.hasMail) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.mail.host,
      port: env.mail.port,
      secure: env.mail.secure,
      auth: { user: env.mail.user, pass: env.mail.pass }
    });
  }
  return transporter;
}

async function sendMail(options) {
  const tx = getTransporter();
  if (!tx) {
    console.warn('SMTP is not configured. Email skipped:', options.subject);
    return { skipped: true };
  }
  return tx.sendMail({ from: env.mail.from, ...options });
}

module.exports = { sendMail };
