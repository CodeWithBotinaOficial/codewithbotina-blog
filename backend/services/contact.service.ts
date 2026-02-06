import { ContactRepository } from "../repositories/contact.repository.ts";
import { EmailService } from "./email.service.ts";
import {
  ContactFormData,
  ContactRecord,
  ServiceResult,
} from "../types/api.types.ts";

export class ContactService {
  private contactRepository: ContactRepository;
  private emailService: EmailService;

  constructor() {
    this.contactRepository = new ContactRepository();
    this.emailService = new EmailService();
  }

  async processContactSubmission(
    data: ContactFormData,
  ): Promise<ServiceResult<ContactRecord>> {
    try {
      // 1. Save to database
      const savedContact = await this.contactRepository.insertContact(data);

      // 2. Send email notification (fire and forget or await depending on requirements)
      // We await here to ensure we catch email errors if that's critical,
      // but usually we might want to return success even if email fails,
      // or log the error without failing the request.
      // The requirement says: "Graceful degradation: If email fails, still save to database"
      try {
        await this.emailService.sendContactNotification(data);
      } catch (emailError) {
        console.error(
          "Email sending failed but contact was saved:",
          emailError,
        );
        // We don't throw here to allow the success response for the saved contact
      }

      return {
        success: true,
        data: savedContact,
      };
    } catch (error) {
      console.error("Service error:", error);
      return {
        success: false,
        error: error instanceof Error
          ? error
          : new Error("Unknown error occurred"),
      };
    }
  }
}
