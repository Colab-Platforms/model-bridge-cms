import bcrypt from "bcryptjs";
import { AuthProvider, Prisma, UserStatus } from "@prisma/client";

import AppError from "../../shared/errors/index.js";
import STATUS_CODES from "../../utils/statusCodes.js";
import prisma from "../../../prisma.js";
import type { LoginInput, RegisterInput } from "./auth.types.js";
import { generateToken, getTokenExpiryDate, hashToken, verifyToken } from "./auth.utils.js";

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
	timezone: true,
	createdAt: true,
	updatedAt: true,
} satisfies Prisma.UserSelect;

const authUserWithPasswordSelect = {
	...authUserSelect,
	passwordHash: true,
} satisfies Prisma.UserSelect;

export type AuthUser = Prisma.UserGetPayload<{ select: typeof authUserSelect }>;

export type AuthTokens = {
	accessToken: string;
	refreshToken: string;
};

export type LoginResult = {
	user: AuthUser;
	tokens: AuthTokens;
};

type SessionContext = {
	deviceName?: string;
	userAgent?: string;
	ipAddress?: string;
};

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

	const isPasswordValid = await bcrypt.compare(body.password, user.passwordHash);

	if (!isPasswordValid) {
		throw new AppError("Invalid email or password", STATUS_CODES.UNAUTHORIZED);
	}

	const { passwordHash: _passwordHash, ...safeUser } = user;

	return prisma.$transaction(async (tx) => {
		const tokens = await issueTokensAndCreateSession(
			tx,
			{
				id: safeUser.id,
				email: safeUser.email,
			},
			context
		);

		return {
			user: safeUser,
			tokens,
		};
	});
};

export const registerService = async (
	body: RegisterInput,
	context?: SessionContext
): Promise<LoginResult> => {
	const passwordHash = await bcrypt.hash(body.password, 10);

	try {
		return await prisma.$transaction(async (tx) => {
			const role = await tx.role.findUnique({
				where: { name: "User" },
				select: { id: true },
			});

			if (!role) {
				throw new AppError("Default user role not found", STATUS_CODES.SERVER_ERROR);
			}

			const user = await tx.user.create({
				data: {
					...mapRegisterData(body),
					passwordHash,
					authProvider: AuthProvider.LOCAL,
					status: UserStatus.ACTIVE,
					userRoles: {
						create: {
							roleId: role.id,
						},
					},
				},
				select: authUserSelect,
			});

			return {
				user: user,
				tokens: await issueTokensAndCreateSession(
					tx,
					{
						id: user.id,
						email: user.email,
					},
					context
				),
			};
		});
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
			user,
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

	await prisma.session.update({
		where: {
			id: session.id,
		},
		data: {
			revokedAt: new Date(),
		},
	});

	return { success: true };
};

export const logoutAllService = async (userId: string) => {
	await prisma.session.updateMany({
		where: {
			userId,
			revokedAt: null,
		},
		data: {
			revokedAt: new Date(),
		},
	});

	return { success: true };
};
