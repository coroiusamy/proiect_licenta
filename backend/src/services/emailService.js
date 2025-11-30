import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendResetEmail = async (toEmail, token) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject: 'Resetare Parolă - Aplicație Analize',
    text: `Salut,\n\nCodul tău de resetare este:\n\n${token}\n\nExpiră într-o oră.`,
  };

  await transporter.sendMail(mailOptions);
};
