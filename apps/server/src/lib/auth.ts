import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import * as schema from "../db/schema/auth";

// Define allowed origins for authentication
const trustedOrigins = [
	'https://cryptowallet-ruby.vercel.app',
	'https://cryptowallet-phucs-projects-174186b3.vercel.app',
	'https://cryptowallet-phamminhphuc1-2745-phucs-projects-174186b3.vercel.app',
	'https://cryptowallet-git-main-phucs-projects-174186b3.vercel.app',
	'http://localhost:3001',
	'http://localhost:3000'
];

// Add CORS_ORIGIN from env if it exists
if (process.env.CORS_ORIGIN) {
	trustedOrigins.push(process.env.CORS_ORIGIN);
}

export const auth = betterAuth<BetterAuthOptions>({
	database: drizzleAdapter(db, {
		provider: "sqlite",

		schema: schema,
	}),
	trustedOrigins: trustedOrigins,
	emailAndPassword: {
		enabled: true,
	},
	advanced: {
		defaultCookieAttributes: {
			sameSite: "none",
			secure: true,
			httpOnly: true,
		},
		disableCSRFCheck: true, // Disable CSRF for cross-domain requests
	},
});
