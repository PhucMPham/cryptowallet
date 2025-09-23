import { protectedProcedure, publicProcedure, router } from "../lib/trpc";
import { cryptoRouter } from "./crypto";
import { p2pRouter } from "./p2p";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => {
		return "OK";
	}),
	privateData: protectedProcedure.query(({ ctx }) => {
		return {
			message: "This is private",
			user: ctx.session.user,
		};
	}),
	crypto: cryptoRouter,
	p2p: p2pRouter,
});
export type AppRouter = typeof appRouter;
