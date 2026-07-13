import { Request, Response } from "express";

import {
  adjustProviderBalance,
  getProviderBalanceByProviderId,
  getProviderBalanceLedger,
  getProviderBalances,
  rechargeProviderBalance,
  updateProviderBalanceSettings,
} from "../../providers/provider-balance.service.js";
import { sendResponse } from "../../../utils/responseUtils.js";
import STATUS_CODES from "../../../utils/statusCodes.js";
import type {
  ProviderBalanceAdjustInput,
  ProviderBalanceIdParams,
  ProviderBalanceLedgerQuery,
  ProviderBalanceRechargeInput,
  ProviderBalanceSettingsInput,
  ProviderBalancesListQuery,
} from "./provider-balances.types.js";

const getActorId = (req: Request) =>
  (req as Request & { user?: { id?: string } }).user?.id;

const getProviderId = (req: Request) =>
  (req.params as unknown as ProviderBalanceIdParams).providerId;

export const getProviderBalancesController = async (req: Request, res: Response) => {
  const query = req.query as ProviderBalancesListQuery;
  const result = await getProviderBalances(query);

  return sendResponse(
    res,
    true,
    result,
    "Provider balances fetched successfully",
    STATUS_CODES.OK
  );
};

export const getProviderBalanceByIdController = async (req: Request, res: Response) => {
  const providerId = getProviderId(req);
  const result = await getProviderBalanceByProviderId(providerId);

  return sendResponse(
    res,
    true,
    result,
    "Provider balance fetched successfully",
    STATUS_CODES.OK
  );
};

export const getProviderBalanceLedgerController = async (req: Request, res: Response) => {
  const providerId = getProviderId(req);
  const query = req.query as ProviderBalanceLedgerQuery;
  const result = await getProviderBalanceLedger(providerId, query);

  return sendResponse(
    res,
    true,
    result,
    "Provider balance ledger fetched successfully",
    STATUS_CODES.OK
  );
};

export const rechargeProviderBalanceController = async (req: Request, res: Response) => {
  const providerId = getProviderId(req);
  const body = req.body as ProviderBalanceRechargeInput;
  const result = await rechargeProviderBalance({
    providerId,
    amount: body.amount,
    description: body.description,
    referenceId: body.referenceId,
    createdBy: getActorId(req),
  });

  return sendResponse(
    res,
    true,
    result,
    "Provider balance recharged successfully",
    STATUS_CODES.OK
  );
};

export const adjustProviderBalanceController = async (req: Request, res: Response) => {
  const providerId = getProviderId(req);
  const body = req.body as ProviderBalanceAdjustInput;
  const result = await adjustProviderBalance({
    providerId,
    amount: body.amount,
    description: body.description,
    referenceId: body.referenceId,
    createdBy: getActorId(req),
  });

  return sendResponse(
    res,
    true,
    result,
    "Provider balance adjusted successfully",
    STATUS_CODES.OK
  );
};

export const updateProviderBalanceSettingsController = async (req: Request, res: Response) => {
  const providerId = getProviderId(req);
  const body = req.body as ProviderBalanceSettingsInput;
  const result = await updateProviderBalanceSettings(providerId, body, getActorId(req));

  return sendResponse(
    res,
    true,
    result,
    "Provider balance settings updated successfully",
    STATUS_CODES.OK
  );
};
