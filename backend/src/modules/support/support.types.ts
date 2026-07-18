import type { SupportTicketCategory, SupportTicketStatus } from "@prisma/client";

export interface CreateSupportTicketInput {
  category: SupportTicketCategory;
  subject: string;
  description: string;
}

export interface SupportTicketRecord {
  id: string;
  referenceNumber: string;
  category: SupportTicketCategory;
  subject: string;
  description: string;
  status: SupportTicketStatus;
  attachmentUrl: string | null;
  attachmentName: string | null;
  createdAt: Date;
}
