import nodemailer from "nodemailer";
// Dummy mail
export const sendEmail = async ({ to, subject, html }) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: process.env.EMAIL_SERVER_PORT,
    secure: false,
    auth: false,
    tls: { rejectUnauthorized: false },
    // secure: true,
    // auth: {
    //   user: process.env.EMAIL_SERVER_USER,
    //   pass: process.env.EMAIL_SERVER_PASSWORD,
    // },
  });

  const mailOptions = {
    from: `${process.env.COMPANY_NAME} <${process.env.EMAIL_FROM}`,
    to: to,
    subject: subject,
    html: html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Message send: %s", info.messageId);
    return info;
  } catch (err) {
    console.error("Error sending mail:", err);
    throw new Error("E posta gonderimi sırasında bir hata oluştu");
  }
};

export const sendActivationEmail = async (
  activateToken,
  userId,
  name,
  email
) => {
  const baseUrl = process.env.APP_BASE_URL;
  const activationLink = `${baseUrl}/activate?uid=${userId}&token=${activateToken}`;

  const emailSubject = `${process.env.COMPANY_NAME} | Hesabınızı aktif edin`;
  const emailHtml = `
      <div>
        <h1>Merhaba ${name},</h1>
        <p>Platformumuza hoş geldiniz! Hesabınızı aktive etmek ve parolanızı oluşturmak için lütfen aşağıdaki butona tıklayın:</p>
        <a 
          href="${activationLink}" 
          style="display: inline-block; padding: 12px 24px; font-size: 16px; color: white; background-color: #007bff; text-decoration: none; border-radius: 5px;"
        >
          Hesabı Aktive Et ve Parola Oluştur
        </a>
        <p>Bu bağlantı 48 saat boyunca geçerlidir.</p>
        <p>Eğer bu işlemi siz yapmadıysanız, bu e-postayı dikkate almayınız.</p>
        <br>
        <p>Teşekkürler,<br>${process.env.COMPANY_NAME} Ekibi</p>
      </div>
    `;

  await sendEmail({ to: email, subject: emailSubject, html: emailHtml });

  return activationLink;
};

export const sendForgotPasswordLink = async (
  resetToken,
  userId,
  name,
  email
) => {
  const baseUrl = process.env.APP_BASE_URL;
  const resetLink = `${baseUrl}/reset-password?uid=${userId}&token=${resetToken}`;

  const emailSubject = `${process.env.COMPANY_NAME} | Parolanızı Sıfırlayın`;
  const emailHtml = `
      <div>
        <h1>Merhaba ${name},</h1>
        <p>Hesabınız için bir parola sıfırlama talebi aldık. Yeni bir parola oluşturmak için lütfen aşağıdaki butona tıklayın:</p>
        <a 
          href="${resetLink}" 
          style="display: inline-block; padding: 12px 24px; font-size: 16px; color: white; background-color: #007bff; text-decoration: none; border-radius: 5px;"
        >
          Parolayı Sıfırla
        </a>
        <p>Bu bağlantı 1 saat boyunca geçerlidir.</p>
        <p>Eğer bu parola sıfırlama talebini siz yapmadıysanız, bu e-postayı dikkate almayınız. Hesabınız güvende kalacaktır.</p>
        <br>
        <p>Teşekkürler,<br>${process.env.COMPANY_NAME} Ekibi</p>
      </div>
    `;

  await sendEmail({ to: email, subject: emailSubject, html: emailHtml });

  return resetLink;
};
