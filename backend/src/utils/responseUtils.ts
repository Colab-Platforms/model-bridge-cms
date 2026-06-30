import { Response } from 'express';
import STATUS_CODES from "./statusCodes.js";

const IST_OFFSET_MINUTES = 5 * 60 + 30;

const pad = (value: number, size = 2) => value.toString().padStart(size, "0");

const formatDateToIST = (date: Date) => {
  const istTime = new Date(date.getTime() + IST_OFFSET_MINUTES * 60 * 1000);

  return `${istTime.getUTCFullYear()}-${pad(istTime.getUTCMonth() + 1)}-${pad(
    istTime.getUTCDate()
  )}T${pad(istTime.getUTCHours())}:${pad(istTime.getUTCMinutes())}:${pad(
    istTime.getUTCSeconds()
  )}.${pad(istTime.getUTCMilliseconds(), 3)}+05:30`;
};

const transformDatesToIST = (value: unknown, visited = new WeakSet<object>()): unknown => {
  if (value instanceof Date) {
    return formatDateToIST(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => transformDatesToIST(item, visited));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  if (visited.has(value)) {
    return "[Circular]";
  }

  visited.add(value);

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      transformDatesToIST(nestedValue, visited),
    ])
  );
};

export const sendResponse = (
  res: Response,
  status: boolean,
  data: unknown,
  message = "",
  statusCode = STATUS_CODES.OK
) => {
  return res.status(statusCode).json({
    status,
    data: transformDatesToIST(data),
    message,
  });
};
