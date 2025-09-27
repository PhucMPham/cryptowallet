"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import type { AppRouter } from "server/routers";

export const api = createTRPCReact<AppRouter>();

export function TRPCProvider({ children }: { children: React.ReactNode }) {
	const [queryClient] = useState(() => new QueryClient());
	const [trpcClient] = useState(() => {
		// Determine the API URL based on environment
		const getApiUrl = () => {
			// In production, use the production server URL
			if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
				return 'https://cryptowallet-server-mbq8dslwx-phucs-projects-174186b3.vercel.app/trpc';
			}
			// In development, use environment variable or fallback to localhost
			return `${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3003'}/trpc`;
		};

		return api.createClient({
			links: [
				httpBatchLink({
					url: getApiUrl(),
					fetch(url, options) {
						return fetch(url, {
							...options,
							credentials: "include",
						});
					},
				}),
			],
		});
	});

	return (
		<api.Provider client={trpcClient} queryClient={queryClient}>
			<QueryClientProvider client={queryClient}>
				{children}
			</QueryClientProvider>
		</api.Provider>
	);
}