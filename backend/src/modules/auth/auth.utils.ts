import crypto from "crypto";
import jwt, {
	type JsonWebTokenError,
	type JwtPayload,
	type NotBeforeError,
	type SignOptions,
	type TokenExpiredError,
} from "jsonwebtoken";

import AppError from "../../shared/errors/index.js";
import STATUS_CODES from "../../utils/statusCodes.js";

export type TokenKind = "access" | "refresh";

export type AuthTokenPayload<TKind extends TokenKind = TokenKind> = {
	userId: string;
	email: string;
	tokenKind: TKind;
};

type GoogleOAuthStatePayload = {
	redirect: string;
	purpose: "google-oauth-state";
};

const getJwtSecret = () => {
	const jwtSecret = process.env.JWT_SECRET;

	if (!jwtSecret) {
		throw new AppError("JWT secret is not configured", STATUS_CODES.SERVER_ERROR);
	}

	return jwtSecret;
};

const getRequiredEnv = (key: string) => {
	const value = process.env[key];

	if (!value) {
		throw new AppError(`${key} is not configured`, STATUS_CODES.SERVER_ERROR);
	}

	return value;
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
	try {
		const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload & AuthTokenPayload<TKind>;

		if (expectedKind && decoded.tokenKind !== expectedKind) {
			throw new AppError("Invalid token kind", STATUS_CODES.UNAUTHORIZED);
		}

		return decoded;
	} catch (error) {
		const jwtError = error as
			| TokenExpiredError
			| JsonWebTokenError
			| NotBeforeError;

		if (jwtError?.name === "TokenExpiredError") {
			throw new AppError("Token expired", STATUS_CODES.UNAUTHORIZED);
		}

		if (jwtError?.name === "NotBeforeError") {
			throw new AppError("Token is not active yet", STATUS_CODES.UNAUTHORIZED);
		}

		if (jwtError?.name === "JsonWebTokenError") {
			throw new AppError("Invalid token", STATUS_CODES.UNAUTHORIZED);
		}

		throw error;
	}
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

export const sanitizeRedirectPath = (redirect?: string | null) => {
	if (!redirect) {
		return "/";
	}

	const trimmedRedirect = redirect.trim();

	if (!trimmedRedirect.startsWith("/") || trimmedRedirect.startsWith("//")) {
		return "/";
	}

	return trimmedRedirect;
};

export const createGoogleOAuthState = (redirect?: string | null) =>
	jwt.sign(
		{
			redirect: sanitizeRedirectPath(redirect),
			purpose: "google-oauth-state",
		} satisfies GoogleOAuthStatePayload,
		getJwtSecret(),
		{
			expiresIn: "10m",
		}
	);

export const verifyGoogleOAuthState = (state: string) => {
	try {
		const decoded = jwt.verify(state, getJwtSecret()) as JwtPayload & Partial<GoogleOAuthStatePayload>;

		if (decoded.purpose !== "google-oauth-state") {
			throw new AppError("Invalid OAuth state", STATUS_CODES.UNAUTHORIZED);
		}

		return sanitizeRedirectPath(decoded.redirect);
	} catch (error) {
		const jwtError = error as
			| TokenExpiredError
			| JsonWebTokenError
			| NotBeforeError;

		if (
			jwtError?.name === "TokenExpiredError" ||
			jwtError?.name === "NotBeforeError" ||
			jwtError?.name === "JsonWebTokenError"
		) {
			throw new AppError("Invalid or expired OAuth state", STATUS_CODES.UNAUTHORIZED);
		}

		throw error;
	}
};

export const getGoogleOAuthConfig = () => ({
	clientId: getRequiredEnv("GOOGLE_CLIENT_ID"),
	clientSecret: getRequiredEnv("GOOGLE_CLIENT_SECRET"),
	callbackUrl: getRequiredEnv("GOOGLE_CALLBACK_URL"),
	frontendCallbackUrl:
		process.env.FRONTEND_GOOGLE_CALLBACK_URL ??
		(process.env.FRONTEND_URL
			? `${process.env.FRONTEND_URL.replace(/\/+$/, "")}/auth/google/callback`
			: getRequiredEnv("FRONTEND_GOOGLE_CALLBACK_URL")),
});

export const buildGoogleAuthorizationUrl = (redirect?: string | null) => {
	const { clientId, callbackUrl } = getGoogleOAuthConfig();
	const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");

	url.searchParams.set("client_id", clientId);
	url.searchParams.set("redirect_uri", callbackUrl);
	url.searchParams.set("response_type", "code");
	url.searchParams.set("scope", "openid email profile");
	url.searchParams.set("state", createGoogleOAuthState(redirect));
	url.searchParams.set("access_type", "offline");
	url.searchParams.set("include_granted_scopes", "true");
	url.searchParams.set("prompt", "select_account");

	return url.toString();
};

export const buildFrontendGoogleCallbackUrl = (params: {
	token?: string;
	refreshToken?: string;
	redirect?: string | null;
	newUser?: boolean;
	error?: string;
}) => {
	const { frontendCallbackUrl } = getGoogleOAuthConfig();
	const url = new URL(frontendCallbackUrl);

	if (params.token) {
		url.searchParams.set("token", params.token);
	}

	if (params.refreshToken) {
		url.searchParams.set("refreshToken", params.refreshToken);
	}

	url.searchParams.set("redirect", sanitizeRedirectPath(params.redirect));

	if (params.newUser) {
		url.searchParams.set("newUser", "1");
	}

	if (params.error) {
		url.searchParams.set("error", params.error);
	}

	return url.toString();
};
