import type { Job } from "bullmq";
import { Prisma } from "@prisma/client";

import prisma from "../../../prisma.js";
import type { ActivityLogJobPayload } from "../types/job-payloads.js";

export async function activityLogProcessor(job: Job<ActivityLogJobPayload>): Promise<void> {
  const input = job.data;

  await prisma.activityLog.create({
    data: {
      activityType: input.activityType,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      userId: input.userId ?? null,
      projectId: input.projectId ?? null,
      metadata: (input.metadata as unknown) as Prisma.InputJsonValue | undefined,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      createdBy: input.actorId ?? null,
    },
  });
}
