import { Request, Response } from "express";

import { sendResponse } from "../../utils/responseUtils.js";
import STATUS_CODES from "../../utils/statusCodes.js";
import {
  addBalance,
  addBalanceToOwnWallet,
  createWalletService,
  deductBalance,
  freezeWallet,
  getBalance,
  getWalletByUserId,
  getWalletTransactions,
  refundBalance,
  unfreezeWallet,
} from "./wallets.service.js";
import type {
  AddBalanceInput,
  DeductBalanceInput,
  RefundBalanceInput,
  WalletStatusBodyInput,
  WalletTransactionsQuery,
} from "./wallets.types.js";

const getActorId = (req: Request) => {
  const actor = (req as Request & { user?: { id?: string } }).user;
  return actor?.id;
};

export const createWalletController = async (req: Request, res: Response) => {
  const actorId = getActorId(req) as string;
  const result = await createWalletService({ userId: actorId }, actorId);

  return sendResponse(res, true, result, "Wallet created successfully", STATUS_CODES.CREATED);
};

export const getMyWalletController = async (req: Request, res: Response) => {
  const actorId = getActorId(req);
  const result = await getWalletByUserId(actorId as string);

  return sendResponse(res, true, result, "Wallet fetched successfully", STATUS_CODES.OK);
};

export const getWalletBalanceController = async (req: Request, res: Response) => {
  const actorId = getActorId(req);
  const result = await getBalance(actorId as string);

  return sendResponse(res, true, result, "Wallet balance fetched successfully", STATUS_CODES.OK);
};

export const getWalletTransactionsController = async (req: Request, res: Response) => {
  const actorId = getActorId(req);
  const query = req.query as WalletTransactionsQuery;
  const result = await getWalletTransactions(actorId as string, query);

  return sendResponse(
    res,
    true,
    result,
    "Wallet transactions fetched successfully",
    STATUS_CODES.OK
  );
};

export const addBalanceController = async (req: Request, res: Response) => {
  const body = req.body as AddBalanceInput;
  const actor = (req as Request & { user?: { id?: string; roles?: string[] } }).user;
  const actorId = actor?.id as string;
  const roles = actor?.roles ?? [];
  const isAdmin = roles.includes("Admin") || roles.includes("SuperAdmin");
  const result = await addBalance({
    ...body,
    userId: isAdmin ? body.userId : actorId,
    createdBy: body.createdBy ?? actorId,
  });

  return sendResponse(res, true, result, "Wallet balance added successfully", STATUS_CODES.OK);
};

export const addBalanceToMyWalletController = async (req: Request, res: Response) => {
  const actorId = getActorId(req) as string;
  const body = req.body as Omit<AddBalanceInput, "userId">;
  const result = await addBalanceToOwnWallet(actorId, {
    ...body,
    createdBy: body.createdBy ?? actorId,
  });

  return sendResponse(res, true, result, "Wallet balance added successfully", STATUS_CODES.OK);
};

export const deductBalanceController = async (req: Request, res: Response) => {
  const body = req.body as DeductBalanceInput;
  const result = await deductBalance({
    ...body,
    createdBy: body.createdBy ?? getActorId(req),
  });

  return sendResponse(res, true, result, "Wallet balance deducted successfully", STATUS_CODES.OK);
};

export const refundBalanceController = async (req: Request, res: Response) => {
  const body = req.body as RefundBalanceInput;
  const result = await refundBalance({
    ...body,
    createdBy: body.createdBy ?? getActorId(req),
  });

  return sendResponse(res, true, result, "Wallet balance refunded successfully", STATUS_CODES.OK);
};

export const freezeWalletController = async (req: Request, res: Response) => {
  const body = req.body as WalletStatusBodyInput;
  const result = await freezeWallet(body.userId, getActorId(req));

  return sendResponse(res, true, result, "Wallet frozen successfully", STATUS_CODES.OK);
};

export const unfreezeWalletController = async (req: Request, res: Response) => {
  const body = req.body as WalletStatusBodyInput;
  const result = await unfreezeWallet(body.userId, getActorId(req));

  return sendResponse(res, true, result, "Wallet unfrozen successfully", STATUS_CODES.OK);
};
