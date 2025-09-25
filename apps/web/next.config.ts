import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

const nextConfig: NextConfig = {
	typedRoutes: true,
	// Leave turbopack config empty for default behavior
	turbopack: {},
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 's2.coinmarketcap.com',
				pathname: '/static/img/coins/**',
			},
		],
	},
};

export default withNextIntl(nextConfig);
