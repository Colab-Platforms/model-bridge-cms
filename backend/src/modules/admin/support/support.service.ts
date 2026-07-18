import { Prisma, SupportTicketStatus } from "@prisma/client";

import prisma from "../../../../prisma.js";
import AppError from "../../../shared/errors/index.js";
import { formatPaginationResponse, getPaginationOptions } from "../../../utils/paginationUtils.js";
import STATUS_CODES from "../../../utils/statusCodes.js";
import type { AdminSupportTicketsQuery, UpdateAdminSupportTicketStatusInput } from "./support.types.js";

const ticketSelect = {
  id: true,
  referenceNumber: true,
  category: true,
  subject: true,
  description: true,
  status: true,
  attachmentUrl: true,
  attachmentName: true,
  attachmentSizeBytes: true,
  resolvedAt: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },
} satisfies Prisma.SupportTicketSelect;

const buildWhere = (query: AdminSupportTicketsQuery): Prisma.SupportTicketWhereInput => ({
  ...(query.search
    ? {
        OR: [
          { referenceNumber: { contains: query.search, mode: "insensitive" } },
          { subject: { contains: query.search, mode: "insensitive" } },
          { description: { contains: query.search, mode: "insensitive" } },
        ],
      }
    : {}),
  ...(query.status ? { status: query.status } : {}),
  ...(query.category ? { category: query.category } : {}),
});

export const getAdminSupportTicketsService = async (query: AdminSupportTicketsQuery) => {
  const { take, skip, page, pageSize } = getPaginationOptions(query, 20);
  const where = buildWhere(query);

  const [tickets, totalRecords] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      select: ticketSelect,
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    prisma.supportTicket.count({ where }),
  ]);

  return formatPaginationResponse(tickets, totalRecords, page, pageSize);
};

export const getAdminSupportTicketByIdService = async (id: string) => {
  const ticket = await prisma.supportTicket.findFirst({
    where: { id },
    select: ticketSelect,
  });

  if (!ticket) {
    throw new AppError("Support ticket not found", STATUS_CODES.NOT_FOUND);
  }

  return ticket;
};

export const updateAdminSupportTicketStatusService = async (
  id: string,
  body: UpdateAdminSupportTicketStatusInput
) => {
  const existing = await prisma.supportTicket.findFirst({ where: { id }, select: { id: true } });

  if (!existing) {
    throw new AppError("Support ticket not found", STATUS_CODES.NOT_FOUND);
  }

  const isResolving =
    body.status === SupportTicketStatus.RESOLVED || body.status === SupportTicketStatus.CLOSED;

  return prisma.supportTicket.update({
    where: { id },
    data: {
      status: body.status,
      ...(isResolving ? { resolvedAt: new Date() } : {}),
    },
    select: ticketSelect,
  });
};
