import bcrypt from "bcryptjs";
import { AuthProvider, Prisma, UserStatus } from "@prisma/client";

import AppError from "../../shared/errors/index.js";
import STATUS_CODES from "../../utils/statusCodes.js";
import prisma from "../../../prisma.js";
import type { LoginInput, RegisterInput } from "./auth.types.js";
import { generateToken, verifyToken } from "./auth.utils.js";

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

export const loginService = async (body: LoginInput): Promise<LoginResult> => {
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
	const payload = {
		userId: safeUser.id,
		email: safeUser.email,
	};

	return {
		user: safeUser,
		tokens: {
			accessToken: generateToken("access", payload),
			refreshToken: generateToken("refresh", payload),
		},
	};
};

export const registerService = async (body: RegisterInput): Promise<LoginResult> => {
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
				tokens: {
					accessToken: generateToken("access", {
						userId: user.id,
						email: user.email,
					}),
					refreshToken: generateToken("refresh", {
						userId: user.id,
						email: user.email,
					}),
				},
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

export const refreshService = async (refreshToken: string): Promise<LoginResult> => {
	const payload = verifyToken(refreshToken, "refresh");

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

	return {
		user,
		tokens: {
			accessToken: generateToken("access", { userId: user.id, email: user.email }),
			refreshToken: generateToken("refresh", { userId: user.id, email: user.email }),
		},
	};
};