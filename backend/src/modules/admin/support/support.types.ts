import type { SupportTicketCategory, SupportTicketStatus } from "@prisma/client";

export interface AdminSupportTicketsQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: SupportTicketStatus;
  category?: SupportTicketCategory;
}

export interface AdminSupportTicketIdParams {
  id: string;
}

export interface UpdateAdminSupportTicketStatusInput {
  status: SupportTicketStatus;
}
