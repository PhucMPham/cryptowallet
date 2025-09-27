"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Search } from "lucide-react";
import { api } from "@/utils/api";
import { cn } from "@/lib/utils";

interface CryptoOption {
	symbol: string;
	name: string;
	rank?: number;
	logo?: string | null;
}

interface CryptoSelectProps {
	value: string;
	onValueChange: (value: string, name: string) => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
}

export function CryptoSelect({
	value,
	onValueChange,
	placeholder = "Select cryptocurrency",
	className,
	disabled = false,
}: CryptoSelectProps) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const [selectedOption, setSelectedOption] = useState<CryptoOption | null>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);

	// Fetch cryptocurrencies based on search - only when dropdown is open
	const { data: cryptos, isLoading } = api.crypto.searchCryptocurrencies.useQuery(
		{
			query: search,
			limit: 20,
			includePrice: false, // Don't fetch price data for better performance
		},
		{
			enabled: open, // Only fetch when dropdown is open
			staleTime: 5 * 60 * 1000, // Cache for 5 minutes
			refetchOnWindowFocus: false, // Don't refetch on window focus
			refetchOnMount: false, // Don't refetch on component mount if data exists
		}
	);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setOpen(false);
			}
		};

		if (open) {
			document.addEventListener("mousedown", handleClickOutside);
			return () => document.removeEventListener("mousedown", handleClickOutside);
		}
	}, [open]);

	// Update selected option when value changes
	useEffect(() => {
		if (value && cryptos) {
			const option = cryptos.find(c => c.symbol === value);
			if (option) {
				setSelectedOption(option);
			}
		}
	}, [value, cryptos]);

	const handleSelect = (crypto: CryptoOption) => {
		setSelectedOption(crypto);
		onValueChange(crypto.symbol, crypto.name);
		setOpen(false);
		setSearch("");
	};


	return (
		<div className="relative" ref={dropdownRef}>
			{/* Main Input/Button */}
			<button
				type="button"
				onClick={() => !disabled && setOpen(!open)}
				disabled={disabled}
				className={cn(
					"flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
					"focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
					"disabled:cursor-not-allowed disabled:opacity-50",
					className
				)}
			>
				<span className={cn("flex items-center gap-2", !selectedOption && "text-muted-foreground")}>
					{selectedOption ? (
						<>
							{selectedOption.logo && (
								<img
									src={selectedOption.logo}
									alt={selectedOption.name}
									className="h-5 w-5 rounded-full"
									onError={(e) => {
										e.currentTarget.style.display = 'none';
									}}
								/>
							)}
							<span className="font-medium">{selectedOption.symbol}</span>
							<span className="text-xs text-muted-foreground">({selectedOption.name})</span>
						</>
					) : (
						placeholder
					)}
				</span>
				<ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
			</button>

			{/* Dropdown */}
			{open && (
				<div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
					{/* Search Input */}
					<div className="border-b p-2">
						<div className="relative">
							<Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
							<input
								type="text"
								placeholder="Search by symbol or name..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
								autoFocus
							/>
						</div>
					</div>

					{/* Options List */}
					<div className="max-h-64 overflow-y-auto p-1">
						{isLoading ? (
							<div className="px-3 py-4 text-center text-sm text-muted-foreground">
								Loading cryptocurrencies...
							</div>
						) : cryptos && cryptos.length > 0 ? (
							cryptos.map((crypto) => (
								<button
									key={crypto.symbol}
									type="button"
									onClick={() => handleSelect(crypto)}
									className={cn(
										"flex w-full items-center justify-between rounded-sm px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground",
										selectedOption?.symbol === crypto.symbol && "bg-accent"
									)}
								>
									<div className="flex items-center gap-3">
										<div className="flex items-center gap-2">
											{crypto.rank && (
												<span className="text-xs text-muted-foreground">#{crypto.rank}</span>
											)}
											{crypto.logo && (
												<img
													src={crypto.logo}
													alt={crypto.name}
													className="h-5 w-5 rounded-full"
													onError={(e) => {
														e.currentTarget.style.display = 'none';
													}}
												/>
											)}
											<span className="font-medium">{crypto.symbol}</span>
										</div>
										<span className="text-xs text-muted-foreground">{crypto.name}</span>
									</div>
								</button>
							))
						) : (
							<div className="px-3 py-4 text-center text-sm text-muted-foreground">
								{search ? `No cryptocurrencies found for "${search}"` : "No cryptocurrencies available"}
							</div>
						)}
					</div>

					{/* Popular Cryptos (when no search) */}
					{!search && !isLoading && (
						<div className="border-t p-2">
							<div className="mb-1 px-2 text-xs font-medium text-muted-foreground">Popular</div>
							<div className="flex flex-wrap gap-1">
								{["BTC", "ETH", "USDT", "BNB", "XRP", "SOL"].map((symbol) => {
									const crypto = cryptos?.find(c => c.symbol === symbol);
									if (!crypto) return null;
									return (
										<button
											key={symbol}
											type="button"
											onClick={() => handleSelect(crypto)}
											className="rounded-full border bg-secondary px-2 py-0.5 text-xs hover:bg-accent"
										>
											{symbol}
										</button>
									);
								})}
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}