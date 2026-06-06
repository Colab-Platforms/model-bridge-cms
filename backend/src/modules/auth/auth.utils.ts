import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";

import AppError from "../../shared/errors/index.js";
import STATUS_CODES from "../../utils/statusCodes.js";

export type TokenKind = "access" | "refresh";

export type AuthTokenPayload<TKind extends TokenKind = TokenKind> = {
	userId: string;
	email: string;
	tokenKind: TKind;
};

const JWT_SECRET = process.env.JWT_SECRET;

const getJwtSecret = () => {
	if (!JWT_SECRET) {
		throw new AppError("JWT secret is not configured", STATUS_CODES.SERVER_ERROR);
	}

	return JWT_SECRET;
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