"use client";
import {Link} from "@/navigation";
import { useTranslations } from 'next-intl';
import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";
import LanguageSwitcher from "./language-switcher";

export default function Header() {
	const t = useTranslations('navigation');
	const links = [
		{ to: "/", label: t('home') },
		{ to: "/dashboard", label: t('dashboard') },
		{ to: "/crypto", label: t('crypto') },
		{ to: "/p2p", label: t('p2p') },
	] as const;

	return (
		<div>
			<div className="flex flex-row items-center justify-between px-2 py-1">
				<nav className="flex gap-4 text-lg">
					{links.map(({ to, label }) => {
						return (
							<Link key={to} href={to}>
								{label}
							</Link>
						);
					})}
				</nav>
				<div className="flex items-center gap-2">
					<LanguageSwitcher />
					<ModeToggle />
					<UserMenu />
				</div>
			</div>
			<hr />
		</div>
	);
}
