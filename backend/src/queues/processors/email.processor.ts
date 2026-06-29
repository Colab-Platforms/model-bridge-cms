import type { Job } from "bullmq";

import { sendEmail } from "../../services/email.service.js";
import type { EmailJobPayload } from "../types/job-payloads.js";

export async function emailProcessor(job: Job<EmailJobPayload>): Promise<void> {
  const { to, subject, html, text } = job.data;

  await sendEmail({ to, subject, html, text });
}
