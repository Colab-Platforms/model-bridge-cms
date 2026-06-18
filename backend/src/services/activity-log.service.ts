import { ActivityType, Prisma } from "@prisma/client";

import prisma from "../../prisma.js";

type ActivityEntityType =
  | "USER"
  | "PROJECT"
  | "API_KEY"
  | "WALLET"
  | "MODEL"
  | "PROVIDER"
  | "AUTH"
  | "SYSTEM";

type ActivityLogInput = {
  activityType: ActivityType;
  entityType: ActivityEntityType;
  entityId?: string | null;
  actorId?: string | null;
  userId?: string | null;
  projectId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
};

type TransactionClient = Prisma.TransactionClient;

class ActivityLogService {
  async log(input: ActivityLogInput, tx?: TransactionClient) {
    const db = tx ?? prisma;

    return db.activityLog.create({
      data: {
        activityType: input.activityType,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        userId: input.userId ?? null,
        projectId: input.projectId ?? null,
        metadata: input.metadata,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        createdBy: input.actorId ?? null,
      },
    });
  }
}

export const activityLogService = new ActivityLogService();
export type { ActivityLogInput, ActivityEntityType, TransactionClient };
