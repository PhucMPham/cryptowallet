import { createAuthClient } from "better-auth/react";

// Determine the auth server URL based on environment
const getAuthBaseURL = () => {
	if (typeof window !== 'undefined') {
		// In production, use the production server URL
		if (window.location.hostname !== 'localhost') {
			return 'https://cryptowallet-server-mbq8dslwx-phucs-projects-174186b3.vercel.app';
		}
	}
	// In development, use environment variable or fallback to localhost
	return process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3003';
};

export const authClient = createAuthClient({
	baseURL: getAuthBaseURL(),
});
