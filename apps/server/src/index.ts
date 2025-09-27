import "dotenv/config";
import { trpcServer } from "@hono/trpc-server";
import { createContext } from "./lib/context";
import { appRouter } from "./routers/index";
import { auth } from "./lib/auth";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

const app = new Hono();

app.use(logger());
app.use(
	"/*",
	cors({
		origin: (origin) => {
			// Allow multiple Vercel deployment URLs and localhost for development
			const allowedOrigins = [
				'https://cryptowallet-ruby.vercel.app',
				'https://cryptowallet-phucs-projects-174186b3.vercel.app',
				'https://cryptowallet-phamminhphuc1-2745-phucs-projects-174186b3.vercel.app',
				'https://cryptowallet-git-main-phucs-projects-174186b3.vercel.app',
				'http://localhost:3001',
				'http://localhost:3000'
			];

			// Also allow any Vercel preview URLs for this project
			if (origin?.includes('cryptowallet') && origin?.includes('vercel.app')) {
				return origin;
			}

			// Check if origin is in the allowed list
			if (origin && allowedOrigins.includes(origin)) {
				return origin;
			}

			// For production, use the configured CORS_ORIGIN if set
			if (process.env.CORS_ORIGIN && origin === process.env.CORS_ORIGIN) {
				return origin;
			}

			// Default to the first allowed origin if no match (for non-browser requests)
			return allowedOrigins[0];
		},
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	}),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.use(
	"/trpc/*",
	trpcServer({
		router: appRouter,
		createContext: (_opts, context) => {
			return createContext({ context });
		},
	}),
);

app.get("/", (c) => {
	return c.text("OK");
});

const port = process.env.PORT || 3003;

export default {
	port,
	fetch: app.fetch,
};

export type { AppRouter } from "./routers/index";
