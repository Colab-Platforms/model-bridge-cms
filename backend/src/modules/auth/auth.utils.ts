import crypto from "crypto";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";

import AppError from "../../shared/errors/index.js";
import STATUS_CODES from "../../utils/statusCodes.js";

export type TokenKind = "access" | "refresh";

export type AuthTokenPayload<TKind extends TokenKind = TokenKind> = {
	userId: string;
	email: string;
	tokenKind: TKind;
};

const getJwtSecret = () => {
	const jwtSecret = process.env.JWT_SECRET;

	if (!jwtSecret) {
		throw new AppError("JWT secret is not configured", STATUS_CODES.SERVER_ERROR);
	}

	return jwtSecret;
};


const getTokenExpiresIn = (kind: TokenKind) => {
	if (kind === "access") {
		return process.env.ACCESS_TOKEN_EXPIRES_IN ?? "1d";
	}

	return process.env.REFRESH_TOKEN_EXPIRES_IN ?? "7d";
};

export const generateToken = <TKind extends TokenKind>(
	kind: TKind,
	payload: Omit<AuthTokenPayload<TKind>, "tokenKind">
) => {
	const tokenPayload: AuthTokenPayload<TKind> = {
		...payload,
		tokenKind: kind,
	};
	const options: SignOptions = {
		expiresIn: getTokenExpiresIn(kind) as SignOptions["expiresIn"],
	};

	console.log("Generating token with payload:", tokenPayload, "and options:", options, "using secret:", getJwtSecret());

	return jwt.sign(tokenPayload, getJwtSecret() as jwt.Secret, options);
};

export const verifyToken = <TKind extends TokenKind = TokenKind>(
	token: string,
	expectedKind?: TKind
) => {
	const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload & AuthTokenPayload<TKind>;

	if (expectedKind && decoded.tokenKind !== expectedKind) {
		throw new AppError("Invalid token kind", STATUS_CODES.UNAUTHORIZED);
	}

	return decoded;
};

export const hashToken = (token: string) =>
	crypto.createHash("sha256").update(token).digest("hex");

export const getTokenExpiryDate = (token: string) => {
	const decoded = jwt.decode(token) as JwtPayload | null;

	if (!decoded?.exp) {
		throw new AppError("Token expiry is missing", STATUS_CODES.UNAUTHORIZED);
	}

	return new Date(decoded.exp * 1000);
};
