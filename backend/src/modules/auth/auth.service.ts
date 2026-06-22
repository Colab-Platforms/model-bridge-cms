import bcrypt from "bcryptjs";
import { ActivityType, AuthProvider, Prisma, UserStatus } from "@prisma/client";

import AppError from "../../shared/errors/index.js";
import STATUS_CODES from "../../utils/statusCodes.js";
import prisma from "../../../prisma.js";
import type {
	GoogleCallbackQueryInput,
	GoogleStartQueryInput,
	LoginInput,
	ResendEmailOtpInput,
	RegisterInput,
	VerifyEmailOtpInput,
} from "./auth.types.js";
import {
	buildFrontendGoogleCallbackUrl,
	buildGoogleAuthorizationUrl,
	generateToken,
	getGoogleOAuthConfig,
	getTokenExpiryDate,
	hashToken,
	verifyGoogleOAuthState,
	verifyToken,
} from "./auth.utils.js";
import { createWallet } from "../wallets/wallets.service.js";
import { sendEmail } from "../../services/email.service.js";

const authUserSelect = {
	id: true,
	email: true,
	firstName: true,
	lastName: true,
	phoneNo: true,
	countryCode: true,
	city: true,
	state: true,
	country: true,
	profileImage: true,
	status: true,
	authProvider: true,
	googleId: true,
	isVerified: true,
	timezone: true,
	createdAt: true,
	updatedAt: true,
	userRoles: {
		where: {
			deletedAt: null,
		},
		select: {
			role: {
				select: {
					name: true,
				},
			},
		},
		take: 1,
	},
} satisfies Prisma.UserSelect;

const authUserWithPasswordSelect = {
	...authUserSelect,
	passwordHash: true,
} satisfies Prisma.UserSelect;

type AuthUserRecord = Prisma.UserGetPayload<{ select: typeof authUserSelect }>;

export type AuthUser = Omit<AuthUserRecord, "userRoles"> & {
	role: string | null;
};

export type AuthTokens = {
	accessToken: string;
	refreshToken: string;
};

export type LoginResult = {
	user: AuthUser;
	tokens: AuthTokens;
};

export type RegisterResult = {
	user: AuthUser;
	verificationRequired: boolean;
};

type SessionContext = {
	deviceName?: string;
	userAgent?: string;
	ipAddress?: string;
};

type GoogleTokenResponse = {
	id_token?: string;
};

type GoogleTokenInfoResponse = {
	sub?: string;
	email?: string;
	email_verified?: string;
	given_name?: string;
	family_name?: string;
	picture?: string;
	aud?: string;
	iss?: string;
	exp?: string;
};

type GoogleAuthResult = {
	redirectUrl: string;
};

const EMAIL_OTP_EXPIRY_MINUTES = 10;

const mapAuthUser = ({ userRoles, ...user }: AuthUserRecord): AuthUser => ({
	...user,
	role: userRoles[0]?.role.name ?? null,
});

const mapRegisterData = (body: RegisterInput) => ({
	email: body.email,
	firstName: body.firstName,
	lastName: body.lastName,
	phoneNo: body.phoneNo,
	countryCode: body.countryCode,
	city: body.city,
	state: body.state,
	country: body.country,
	profileImage: body.profileImage,
	timezone: body.timezone,
});

const getDefaultUserRole = async (tx: Prisma.TransactionClient) => {
	const role = await tx.role.findUnique({
		where: { name: "User" },
		select: { id: true },
	});

	if (!role) {
		throw new AppError("Default user role not found", STATUS_CODES.SERVER_ERROR);
	}

	return role;
};

const generateEmailOtp = () =>
	Math.floor(100000 + Math.random() * 900000).toString();

const getEmailOtpExpiry = () =>
	new Date(Date.now() + EMAIL_OTP_EXPIRY_MINUTES * 60 * 1000);

const sendVerificationOtpEmail = async (email: string, otp: string) => {
	await sendEmail({
		to: email,
		subject: "Verify your email address",
		text: `Your verification code is ${otp}. It expires in ${EMAIL_OTP_EXPIRY_MINUTES} minutes.`,
		html: `<p>Your verification code is <strong>${otp}</strong>.</p><p>It expires in ${EMAIL_OTP_EXPIRY_MINUTES} minutes.</p>`,
	});
};

const persistEmailVerificationOtp = async (
	tx: Prisma.TransactionClient,
	user: { id: string }
) => {
	const otp = generateEmailOtp();

	await tx.user.update({
		where: { id: user.id },
		data: {
			emailVerificationOtpHash: hashToken(otp),
			emailVerificationOtpExpiresAt: getEmailOtpExpiry(),
		},
	});

	return otp;
};

const buildTokens = (userId: string, email: string): AuthTokens => ({
	accessToken: generateToken("access", { userId, email }),
	refreshToken: generateToken("refresh", { userId, email }),
});

const createSession = async (
	tx: Prisma.TransactionClient,
	userId: string,
	refreshToken: string,
	context?: SessionContext
) => {
	await tx.session.create({
		data: {
			userId,
			refreshTokenHash: hashToken(refreshToken),
			deviceName: context?.deviceName,
			userAgent: context?.userAgent,
			ipAddress: context?.ipAddress,
			expiresAt: getTokenExpiryDate(refreshToken),
			absoluteExpiresAt: getTokenExpiryDate(refreshToken),
			lastUsedAt: new Date(),
		},
	});
};

const issueTokensAndCreateSession = async (
	tx: Prisma.TransactionClient,
	user: { id: string; email: string },
	context?: SessionContext
) => {
	const tokens = buildTokens(user.id, user.email);
	await createSession(tx, user.id, tokens.refreshToken, context);
	return tokens;
};

const findActiveSessionByRefreshToken = async (refreshToken: string, userId: string) => {
	const refreshTokenHash = hashToken(refreshToken);

	return prisma.session.findFirst({
		where: {
			userId,
			refreshTokenHash,
			revokedAt: null,
			OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
			absoluteExpiresAt: {
				gt: new Date(),
			},
		},
	});
};

const exchangeGoogleCodeForIdToken = async (code: string) => {
	const { clientId, clientSecret, callbackUrl } = getGoogleOAuthConfig();
	const response = await fetch("https://oauth2.googleapis.com/token", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: new URLSearchParams({
			code,
			client_id: clientId,
			client_secret: clientSecret,
			redirect_uri: callbackUrl,
			grant_type: "authorization_code",
		}),
	});

	if (!response.ok) {
		throw new AppError("Failed to exchange Google authorization code", STATUS_CODES.BAD_REQUEST);
	}

	const tokenResponse = (await response.json()) as GoogleTokenResponse;

	if (!tokenResponse.id_token) {
		throw new AppError("Google did not return an ID token", STATUS_CODES.BAD_REQUEST);
	}

	return tokenResponse.id_token;
};

const verifyGoogleIdToken = async (idToken: string) => {
	const { clientId } = getGoogleOAuthConfig();
	const tokenInfoUrl = new URL("https://oauth2.googleapis.com/tokeninfo");
	tokenInfoUrl.searchParams.set("id_token", idToken);

	const response = await fetch(tokenInfoUrl, {
		method: "GET",
	});

	if (!response.ok) {
		throw new AppError("Failed to verify Google ID token", STATUS_CODES.UNAUTHORIZED);
	}

	const tokenInfo = (await response.json()) as GoogleTokenInfoResponse;
	const isIssuerValid =
		tokenInfo.iss === "accounts.google.com" || tokenInfo.iss === "https://accounts.google.com";
	const isAudienceValid = tokenInfo.aud === clientId;
	const isEmailVerified = tokenInfo.email_verified === "true";
	const isExpired =
		!tokenInfo.exp || Number.isNaN(Number(tokenInfo.exp)) || Number(tokenInfo.exp) * 1000 <= Date.now();

	if (!isIssuerValid || !isAudienceValid || isExpired) {
		throw new AppError("Invalid Google identity token", STATUS_CODES.UNAUTHORIZED);
	}

	if (!tokenInfo.sub || !tokenInfo.email || !isEmailVerified) {
		throw new AppError("Google account email is not verified", STATUS_CODES.BAD_REQUEST);
	}

	return tokenInfo;
};

const findOrCreateGoogleUser = async (
	profile: GoogleTokenInfoResponse,
	context?: SessionContext
) => {
	return prisma.$transaction(async (tx) => {
		const role = await getDefaultUserRole(tx);
		const existingUser = await tx.user.findFirst({
			where: {
				email: profile.email as string,
				isDeleted: false,
			},
			select: authUserWithPasswordSelect,
		});

		if (existingUser) {
			if (existingUser.status !== UserStatus.ACTIVE) {
				throw new AppError("User account is not active", STATUS_CODES.FORBIDDEN);
			}

			if (existingUser.authProvider === AuthProvider.LOCAL && !existingUser.googleId) {
				throw new AppError(
					"An account with this email already exists. Sign in with email/password first to link it safely.",
					STATUS_CODES.CONFLICT
				);
			}

			if (existingUser.googleId && existingUser.googleId !== profile.sub) {
				throw new AppError(
					"This email is already linked to a different Google account",
					STATUS_CODES.CONFLICT
				);
			}

			const updatedUser = await tx.user.update({
				where: { id: existingUser.id },
				data: {
					authProvider: AuthProvider.GOOGLE,
					googleId: profile.sub,
					isVerified: true,
					firstName: existingUser.firstName ?? profile.given_name ?? null,
					lastName: existingUser.lastName ?? profile.family_name ?? null,
					profileImage: profile.picture ?? existingUser.profileImage ?? null,
				},
				select: authUserSelect,
			});

			const tokens = await issueTokensAndCreateSession(
				tx,
				{
					id: updatedUser.id,
					email: updatedUser.email,
				},
				context
			);

			return {
				user: mapAuthUser(updatedUser),
				tokens,
				isNewUser: false,
			};
		}

		const user = await tx.user.create({
			data: {
				email: profile.email as string,
				passwordHash: null,
				firstName: profile.given_name ?? null,
				lastName: profile.family_name ?? null,
				profileImage: profile.picture ?? null,
				authProvider: AuthProvider.GOOGLE,
				googleId: profile.sub as string,
				isVerified: true,
				status: UserStatus.ACTIVE,
				userRoles: {
					create: {
						roleId: role.id,
					},
				},
			},
			select: authUserSelect,
		});

		await createWallet(user.id, user.id, tx);

		return {
			user: mapAuthUser(user),
			tokens: await issueTokensAndCreateSession(
				tx,
				{
					id: user.id,
					email: user.email,
				},
				context
			),
			isNewUser: true,
		};
	});
};

export const loginService = async (
	body: LoginInput,
	context?: SessionContext
): Promise<LoginResult> => {
	const user = await prisma.user.findUnique({
		where: { email: body.email, isDeleted: false },
		select: authUserWithPasswordSelect,
	});

	if (!user) {
		throw new AppError("Invalid email or password", STATUS_CODES.UNAUTHORIZED);
	}

	if (user.status !== UserStatus.ACTIVE) {
		throw new AppError("User account is not active", STATUS_CODES.FORBIDDEN);
	}

	if (!user.passwordHash || user.authProvider === AuthProvider.GOOGLE) {
		throw new AppError(
			"This account uses Google sign-in. Please continue with Google.",
			STATUS_CODES.UNAUTHORIZED
		);
	}

	if (!user.isVerified) {
		throw new AppError(
			"Please verify your email before logging in",
			STATUS_CODES.FORBIDDEN
		);
	}

	const isPasswordValid = await bcrypt.compare(body.password, user.passwordHash);

	if (!isPasswordValid) {
		throw new AppError("Invalid email or password", STATUS_CODES.UNAUTHORIZED);
	}

	const { passwordHash: _passwordHash, ...safeUser } = user;
	const authUser = mapAuthUser(safeUser);

	return prisma.$transaction(async (tx) => {
		const tokens = await issueTokensAndCreateSession(
			tx,
			{
				id: authUser.id,
				email: authUser.email,
			},
			context
		);

		await activityLogService.log(
			{
				activityType: ActivityType.USER_LOGIN,
				entityType: "AUTH",
				entityId: safeUser.id,
				actorId: safeUser.id,
				userId: safeUser.id,
				metadata: {
					email: safeUser.email,
					deviceName: context?.deviceName ?? null,
				},
				ipAddress: context?.ipAddress,
				userAgent: context?.userAgent,
			},
			tx
		);

		return {
			user: authUser,
			tokens,
		};
	});
};

export const registerService = async (
	body: RegisterInput,
	_context?: SessionContext
): Promise<RegisterResult> => {
	const passwordHash = await bcrypt.hash(body.password, 10);

	console.log("Registering user with email:", body.email); // Debug log

	try {
		const result = await prisma.$transaction(async (tx) => {
			const role = await getDefaultUserRole(tx);

			const user = await tx.user.create({
				data: {
					...mapRegisterData(body),
					passwordHash,
					authProvider: AuthProvider.LOCAL,
					isVerified: false,
					status: UserStatus.ACTIVE,
					userRoles: {
						create: {
							roleId: role.id,
						},
					},
				},
				select: authUserSelect,
			});

			await createWallet(user.id, user.id, tx);
			const otp = await persistEmailVerificationOtp(tx, {
				id: user.id,
			});

			return {
				user: mapAuthUser(user),
				email: user.email,
				otp,
				verificationRequired: true,
			};
		});

		await sendVerificationOtpEmail(result.email, result.otp);

		return {
			user: result.user,
			verificationRequired: result.verificationRequired,
		};
	} catch (error: unknown) {
		if (
			typeof error === "object" &&
			error !== null &&
			"code" in error &&
			(error as { code?: string }).code === "P2002"
		) {
			throw new AppError("Email already exists", STATUS_CODES.CONFLICT);
		}

		throw error;
	}
};

export const refreshService = async (
	refreshToken: string,
	context?: SessionContext
): Promise<LoginResult> => {
	const payload = verifyToken(refreshToken, "refresh");
	const session = await findActiveSessionByRefreshToken(refreshToken, payload.userId);

	if (!session) {
		throw new AppError("Refresh session is invalid or expired", STATUS_CODES.UNAUTHORIZED);
	}

	const user = await prisma.user.findUnique({
		where: { id: payload.userId, isDeleted: false },
		select: authUserSelect,
	});

	if (!user) {
		throw new AppError("Invalid token user", STATUS_CODES.UNAUTHORIZED);
	}

	if (user.status !== UserStatus.ACTIVE) {
		throw new AppError("User account is not active", STATUS_CODES.FORBIDDEN);
	}

	return prisma.$transaction(async (tx) => {
		const tokens = buildTokens(user.id, user.email);

		await tx.session.update({
			where: {
				id: session.id,
			},
			data: {
				refreshTokenHash: hashToken(tokens.refreshToken),
				expiresAt: getTokenExpiryDate(tokens.refreshToken),
				absoluteExpiresAt: getTokenExpiryDate(tokens.refreshToken),
				lastUsedAt: new Date(),
				deviceName: context?.deviceName ?? session.deviceName,
				userAgent: context?.userAgent ?? session.userAgent,
				ipAddress: context?.ipAddress ?? session.ipAddress,
			},
		});

		return {
			user: mapAuthUser(user),
			tokens,
		};
	});
};

export const logoutService = async (refreshToken: string) => {
	const payload = verifyToken(refreshToken, "refresh");
	const refreshTokenHash = hashToken(refreshToken);

	const session = await prisma.session.findFirst({
		where: {
			userId: payload.userId,
			refreshTokenHash,
			revokedAt: null,
		},
		select: { id: true },
	});

	if (!session) {
		throw new AppError("Session not found", STATUS_CODES.NOT_FOUND);
	}

	await prisma.$transaction(async (tx) => {
		await tx.session.update({
			where: {
				id: session.id,
			},
			data: {
				revokedAt: new Date(),
			},
		});

		await activityLogService.log(
			{
				activityType: ActivityType.USER_LOGOUT,
				entityType: "AUTH",
				entityId: session.id,
				actorId: payload.userId,
				userId: payload.userId,
				metadata: {
					sessionId: session.id,
					scope: "single",
				},
			},
			tx
		);
	});

	return { success: true };
};

export const verifyEmailOtpService = async (
	input: VerifyEmailOtpInput,
	context?: SessionContext
): Promise<LoginResult> => {
	const user = await prisma.user.findFirst({
		where: {
			email: input.email,
			isDeleted: false,
		},
		select: authUserSelect,
	});

	if (!user) {
		throw new AppError("User not found", STATUS_CODES.NOT_FOUND);
	}

	if (user.authProvider !== AuthProvider.LOCAL) {
		throw new AppError("Email verification is only required for local accounts", STATUS_CODES.BAD_REQUEST);
	}

	if (user.isVerified) {
		throw new AppError("Email is already verified", STATUS_CODES.BAD_REQUEST);
	}

	const userWithOtp = await prisma.user.findFirst({
		where: {
			id: user.id,
			isDeleted: false,
		},
		select: {
			id: true,
			email: true,
			emailVerificationOtpHash: true,
			emailVerificationOtpExpiresAt: true,
		},
	});

	if (
		!userWithOtp?.emailVerificationOtpHash ||
		!userWithOtp.emailVerificationOtpExpiresAt
	) {
		throw new AppError("Verification OTP was not requested", STATUS_CODES.BAD_REQUEST);
	}

	if (userWithOtp.emailVerificationOtpExpiresAt <= new Date()) {
		throw new AppError("Verification OTP has expired", STATUS_CODES.BAD_REQUEST);
	}

	if (userWithOtp.emailVerificationOtpHash !== hashToken(input.otp)) {
		throw new AppError("Invalid verification OTP", STATUS_CODES.BAD_REQUEST);
	}

	return prisma.$transaction(async (tx) => {
		const verifiedUser = await tx.user.update({
			where: { id: user.id },
			data: {
				isVerified: true,
				emailVerificationOtpHash: null,
				emailVerificationOtpExpiresAt: null,
			},
			select: authUserSelect,
		});

		return {
			user: mapAuthUser(verifiedUser),
			tokens: await issueTokensAndCreateSession(
				tx,
				{
					id: verifiedUser.id,
					email: verifiedUser.email,
				},
				context
			),
		};
	});
};

export const resendEmailOtpService = async (
	input: ResendEmailOtpInput
) => {
	const user = await prisma.user.findFirst({
		where: {
			email: input.email,
			isDeleted: false,
		},
		select: {
			id: true,
			email: true,
			authProvider: true,
			isVerified: true,
			status: true,
		},
	});

	if (!user) {
		throw new AppError("User not found", STATUS_CODES.NOT_FOUND);
	}

	if (user.authProvider !== AuthProvider.LOCAL) {
		throw new AppError("Email verification is only required for local accounts", STATUS_CODES.BAD_REQUEST);
	}

	if (user.status !== UserStatus.ACTIVE) {
		throw new AppError("User account is not active", STATUS_CODES.FORBIDDEN);
	}

	if (user.isVerified) {
		throw new AppError("Email is already verified", STATUS_CODES.BAD_REQUEST);
	}

	const otp = await prisma.$transaction(async (tx) =>
		persistEmailVerificationOtp(tx, {
			id: user.id,
		})
	);

	await sendVerificationOtpEmail(user.email, otp);

	return {
		success: true,
		verificationRequired: true,
	};
};

export const getGoogleAuthorizationUrlService = (query: GoogleStartQueryInput) =>
	buildGoogleAuthorizationUrl(query.redirect);

export const googleCallbackService = async (
	query: GoogleCallbackQueryInput,
	context?: SessionContext
): Promise<GoogleAuthResult> => {
	if (query.error) {
		throw new AppError(query.error_description ?? query.error, STATUS_CODES.BAD_REQUEST);
	}

	if (!query.code) {
		throw new AppError("Google authorization code is missing", STATUS_CODES.BAD_REQUEST);
	}

	if (!query.state) {
		throw new AppError("OAuth state is missing", STATUS_CODES.BAD_REQUEST);
	}

	const redirect = verifyGoogleOAuthState(query.state);
	const idToken = await exchangeGoogleCodeForIdToken(query.code);
	const googleProfile = await verifyGoogleIdToken(idToken);
	const result = await findOrCreateGoogleUser(googleProfile, context);

	return {
		redirectUrl: buildFrontendGoogleCallbackUrl({
			token: result.tokens.accessToken,
			refreshToken: result.tokens.refreshToken,
			redirect,
			newUser: result.isNewUser,
		}),
	};
};

export const logoutAllService = async (userId: string) => {
	await prisma.$transaction(async (tx) => {
		const result = await tx.session.updateMany({
			where: {
				userId,
				revokedAt: null,
			},
			data: {
				revokedAt: new Date(),
			},
		});

		await activityLogService.log(
			{
				activityType: ActivityType.USER_LOGOUT,
				entityType: "AUTH",
				entityId: userId,
				actorId: userId,
				userId,
				metadata: {
					scope: "all",
					revokedSessions: result.count,
				},
			},
			tx
		);
	});

	return { success: true };
};
