import { Resend } from "resend";
import { EMAIL_CONFIG, resend } from "../lib/resend.ts";
import { ContactFormData } from "../types/api.types.ts";
import { EmailServiceError } from "../utils/errors.ts";

export class EmailService {
  private emailer: Resend;

  constructor(resendClient: Resend = resend) {
    this.emailer = resendClient;
  }

  async sendContactNotification(contactData: ContactFormData): Promise<void> {
    const { error } = await this.emailer.emails.send({
      from: EMAIL_CONFIG.FROM,
      to: EMAIL_CONFIG.TO,
      subject: `New Contact Form Submission from ${contactData.nombre}`,
      html: `
        <h2>New Contact Submission</h2>
        <p><strong>Name:</strong> ${contactData.nombre}</p>
        <p><strong>Email:</strong> ${contactData.correo}</p>
        <p><strong>Message:</strong></p>
        <p>${contactData.mensaje}</p>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      throw new EmailServiceError("Failed to send email notification");
    }
  }
}
