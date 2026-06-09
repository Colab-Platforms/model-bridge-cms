import { Prisma, WalletStatus } from "@prisma/client";

import AppError from "../../shared/errors/index.js";
import STATUS_CODES from "../../utils/statusCodes.js";
import { ACTIVE_WALLET_STATUS, WALLET_ERRORS } from "./wallet.constants.js";

export const toDecimal = (amount: number | string | Prisma.Decimal) =>
  amount instanceof Prisma.Decimal ? amount : new Prisma.Decimal(amount);

export const decimalToNumber = (amount: Prisma.Decimal | number | null | undefined) =>
  amount === null || amount === undefined ? 0 : Number(amount);

export const assertPositiveAmount = (amount: number | string | Prisma.Decimal) => {
  const decimalAmount = toDecimal(amount);

  if (decimalAmount.lte(0)) {
    throw new AppError(WALLET_ERRORS.INVALID_AMOUNT, STATUS_CODES.BAD_REQUEST);
  }

  return decimalAmount;
};

export const assertWalletUsable = (wallet: {
  isDeleted: boolean;
  status: WalletStatus;
}) => {
  if (wallet.isDeleted) {
    throw new AppError(WALLET_ERRORS.DELETED, STATUS_CODES.BAD_REQUEST);
  }

  if (wallet.status !== ACTIVE_WALLET_STATUS) {
    throw new AppError(WALLET_ERRORS.INACTIVE, STATUS_CODES.BAD_REQUEST);
  }
};

export const ensureSufficientBalance = (
  currentBalance: Prisma.Decimal,
  amount: Prisma.Decimal
) => {
  if (currentBalance.lt(amount)) {
    throw new AppError(WALLET_ERRORS.INSUFFICIENT_BALANCE, STATUS_CODES.BAD_REQUEST);
  }
};

export const buildWalletDescription = (action: string, description?: string) =>
  description?.trim() || action;
