"use client";

import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "./theme-provider";
import { Toaster } from "./ui/sonner";
import { TRPCProvider } from "@/utils/api";

export default function Providers({ children }: { children: React.ReactNode }) {
	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="system"
			enableSystem
			disableTransitionOnChange
		>
			<TRPCProvider>
				{children}
				<ReactQueryDevtools />
			</TRPCProvider>
			<Toaster richColors />
		</ThemeProvider>
	);
}
