import { sendResponse } from "../../utils/responseUtils.js";
import STATUS_CODES from "../../utils/statusCodes.js";
import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../../modules/auth/auth.utils.js";
import prisma from "../../../prisma.js";

type AllowedRole = "USER" | "ADMIN" | "SUPERADMIN";
type RoleName = "User" | "Admin" | "SuperAdmin";

const mapAllowedRole = (r: AllowedRole): RoleName => {
  switch (r) {
    case "USER":
      return "User";
    case "ADMIN":
      return "Admin";
    case "SUPERADMIN":
      return "SuperAdmin";
  }
};

export const auth = (...allowedRoles: AllowedRole[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        sendResponse(res, false, null, "Unauthorized: Token missing", STATUS_CODES.UNAUTHORIZED);
        return;
      }

      const token = authHeader.split(" ")[1];
      const decoded = verifyToken(token, "access");

      // load user roles from DB
      const userId = decoded.userId;

      const userRoles = await prisma.userRole.findMany({
        where: { userId },
        include: { role: { select: { name: true } } },
      });

      const roleNames = userRoles.map((ur) => ur.role.name as RoleName);

      if (allowedRoles.length) {
        const allowed = allowedRoles.map(mapAllowedRole);
        const has = roleNames.some((rn) => allowed.includes(rn as RoleName));
        if (!has) {
          sendResponse(res, false, null, "Forbidden: You don't have access", STATUS_CODES.FORBIDDEN);
          return;
        }
      }

      (req as any).user = { id: userId, email: decoded.email, roles: roleNames };

      next();
    } catch (err: any) {
      console.error("Auth Middleware Error:", err);
      sendResponse(res, false, null, "Unauthorized: " + (err?.message ?? String(err)), STATUS_CODES.UNAUTHORIZED);
      return;
    }
  };
};

export default auth;
