import AppError from "../shared/errors/index.js";
import STATUS_CODES from "../utils/statusCodes.js";

type SendEmailInput = {
	to: string;
	subject: string;
	html: string;
	text: string;
};

const getNodeEnv = () => process.env.NODE_ENV ?? "development";

const getEmailFrom = () => process.env.EMAIL_FROM ?? "no-reply@colabplatforms.ai";

const sendWithResend = async (input: SendEmailInput) => {
	const apiKey = process.env.RESEND_API_KEY;

	if (!apiKey) {
		return false;
	}

	const response = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			from: getEmailFrom(),
			to: [input.to],
			subject: input.subject,
			html: input.html,
			text: input.text,
		}),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new AppError(
			`Failed to send email: ${errorText || "Email provider request failed"}`,
			STATUS_CODES.SERVER_ERROR
		);
	}

	return true;
};

const sendWithConsoleFallback = async (input: SendEmailInput) => {
	if (getNodeEnv() === "production") {
		throw new AppError(
			"Email provider is not configured",
			STATUS_CODES.SERVER_ERROR
		);
	}

	console.log("[Email:dev-fallback]", {
		from: getEmailFrom(),
		to: input.to,
		subject: input.subject,
		text: input.text,
	});
};

export const sendEmail = async (input: SendEmailInput) => {
	const delivered = await sendWithResend(input);

	if (delivered) {
		return;
	}

	await sendWithConsoleFallback(input);
};
