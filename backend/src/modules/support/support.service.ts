import { randomBytes } from "crypto";

import { SupportTicketStatus } from "@prisma/client";

import prisma from "../../../prisma.js";
import { uploadFile } from "../../services/cloudinary.service.js";
import { enqueueEmail } from "../../services/email.service.js";
import AppError from "../../shared/errors/index.js";
import STATUS_CODES from "../../utils/statusCodes.js";
import type { CreateSupportTicketInput, SupportTicketRecord } from "./support.types.js";

const MAX_REFERENCE_ATTEMPTS = 5;

const generateReferenceCandidate = () => `TCK-${randomBytes(4).toString("hex").toUpperCase()}`;

const generateUniqueReference = async (): Promise<string> => {
  for (let attempt = 0; attempt < MAX_REFERENCE_ATTEMPTS; attempt++) {
    const candidate = generateReferenceCandidate();
    const existing = await prisma.supportTicket.findUnique({
      where: { referenceNumber: candidate },
      select: { id: true },
    });
    if (!existing) {
      return candidate;
    }
  }

  throw new AppError(
    "Could not generate a unique ticket reference, please try again",
    STATUS_CODES.SERVER_ERROR
  );
};

const toSupportTicketRecord = (ticket: {
  id: string;
  referenceNumber: string;
  category: SupportTicketRecord["category"];
  subject: string;
  description: string;
  status: SupportTicketStatus;
  attachmentUrl: string | null;
  attachmentName: string | null;
  createdAt: Date;
}): SupportTicketRecord => ({
  id: ticket.id,
  referenceNumber: ticket.referenceNumber,
  category: ticket.category,
  subject: ticket.subject,
  description: ticket.description,
  status: ticket.status,
  attachmentUrl: ticket.attachmentUrl,
  attachmentName: ticket.attachmentName,
  createdAt: ticket.createdAt,
});

const sendConfirmationEmail = async (input: {
  to: string;
  referenceNumber: string;
  subject: string;
}) => {
  try {
    await enqueueEmail({
      to: input.to,
      subject: `We received your request [${input.referenceNumber}]`,
      html: `<p>Thanks for reaching out. Your ticket <strong>${input.referenceNumber}</strong> ("${input.subject}") has been received. Our team typically responds within one business day.</p>`,
      text: `Thanks for reaching out. Your ticket ${input.referenceNumber} ("${input.subject}") has been received. Our team typically responds within one business day.`,
    });
  } catch (error) {
    // Confirmation email is best-effort — the ticket itself is already saved.
    console.error("[support] failed to enqueue confirmation email:", error);
  }
};

const sendSupportTeamNotification = async (input: {
  referenceNumber: string;
  category: string;
  subject: string;
  description: string;
  submitterEmail: string;
  attachmentUrl?: string;
}) => {
  const supportTeamEmail = process.env.SUPPORT_TEAM_EMAIL;

  if (!supportTeamEmail) {
    console.warn(
      "[support] SUPPORT_TEAM_EMAIL is not configured — skipping new-ticket notification"
    );
    return;
  }

  try {
    await enqueueEmail({
      to: supportTeamEmail,
      subject: `New support ticket [${input.referenceNumber}]: ${input.subject}`,
      html: `
        <p><strong>From:</strong> ${input.submitterEmail}</p>
        <p><strong>Category:</strong> ${input.category}</p>
        <p><strong>Subject:</strong> ${input.subject}</p>
        <p><strong>Description:</strong></p>
        <p>${input.description.replace(/\n/g, "<br/>")}</p>
        ${input.attachmentUrl ? `<p><strong>Attachment:</strong> <a href="${input.attachmentUrl}">${input.attachmentUrl}</a></p>` : ""}
      `,
      text: [
        `From: ${input.submitterEmail}`,
        `Category: ${input.category}`,
        `Subject: ${input.subject}`,
        "",
        input.description,
        input.attachmentUrl ? `\nAttachment: ${input.attachmentUrl}` : "",
      ].join("\n"),
    });
  } catch (error) {
    // Notification is best-effort — the ticket itself is already saved and the
    // submitter's confirmation email is independent of this.
    console.error("[support] failed to enqueue support-team notification email:", error);
  }
};

export const createTicketService = async (
  input: CreateSupportTicketInput,
  userId: string,
  userEmail: string,
  file?: Express.Multer.File
): Promise<SupportTicketRecord> => {
  const referenceNumber = await generateUniqueReference();

  let attachmentUrl: string | undefined;
  let attachmentSizeBytes: number | undefined;

  if (file) {
    const uploaded = await uploadFile(file.buffer, "ColabOne/support-tickets", referenceNumber);
    attachmentUrl = uploaded.url;
    attachmentSizeBytes = uploaded.bytes;
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      userId,
      referenceNumber,
      category: input.category,
      subject: input.subject,
      description: input.description,
      status: SupportTicketStatus.OPEN,
      attachmentUrl,
      attachmentName: file?.originalname,
      attachmentSizeBytes,
    },
  });

  await sendConfirmationEmail({ to: userEmail, referenceNumber, subject: input.subject });
  await sendSupportTeamNotification({
    referenceNumber,
    category: input.category,
    subject: input.subject,
    description: input.description,
    submitterEmail: userEmail,
    attachmentUrl,
  });

  return toSupportTicketRecord(ticket);
};
