import { db } from "../db";
import { portfolioHistory } from "../db/schema/crypto";
import { gte, sql, desc } from "drizzle-orm";

export type TimeRange = "1D" | "1W" | "1M" | "3M" | "1Y" | "ALL";

export interface PortfolioSnapshot {
	id: number;
	totalValueUsd: number;
	totalValueVnd: number;
	snapshotDate: Date;
}

class PortfolioHistoryService {
	// Create a portfolio snapshot
	async createSnapshot(totalValueUsd: number, totalValueVnd: number, userId?: string): Promise<void> {
		try {
			await db.insert(portfolioHistory).values({
				userId: userId || null,
				totalValueUsd,
				totalValueVnd,
				snapshotDate: new Date(),
			});
			console.log(`Portfolio snapshot created: USD ${totalValueUsd}, VND ${totalValueVnd}`);
		} catch (error) {
			console.error("Error creating portfolio snapshot:", error);
			throw error;
		}
	}

	// Get date range for time filter
	private getDateRange(range: TimeRange): Date {
		const now = new Date();
		switch (range) {
			case "1D":
				return new Date(now.getTime() - 24 * 60 * 60 * 1000);
			case "1W":
				return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
			case "1M":
				return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
			case "3M":
				return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
			case "1Y":
				return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
			case "ALL":
				return new Date(0); // Beginning of time
			default:
				return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Default to 1 week
		}
	}

	// Get portfolio history for a specific time range
	async getHistory(range: TimeRange = "1W", userId?: string): Promise<PortfolioSnapshot[]> {
		try {
			const startDate = this.getDateRange(range);

			const results = await db
				.select({
					id: portfolioHistory.id,
					totalValueUsd: portfolioHistory.totalValueUsd,
					totalValueVnd: portfolioHistory.totalValueVnd,
					snapshotDate: portfolioHistory.snapshotDate,
				})
				.from(portfolioHistory)
				.where(gte(portfolioHistory.snapshotDate, startDate))
				.orderBy(portfolioHistory.snapshotDate);

			return results.map((r) => ({
				id: r.id,
				totalValueUsd: r.totalValueUsd,
				totalValueVnd: r.totalValueVnd,
				snapshotDate: r.snapshotDate,
			}));
		} catch (error) {
			console.error(`Error fetching portfolio history for range ${range}:`, error);
			return [];
		}
	}

	// Get the latest portfolio snapshot
	async getLatestSnapshot(userId?: string): Promise<PortfolioSnapshot | null> {
		try {
			const result = await db
				.select({
					id: portfolioHistory.id,
					totalValueUsd: portfolioHistory.totalValueUsd,
					totalValueVnd: portfolioHistory.totalValueVnd,
					snapshotDate: portfolioHistory.snapshotDate,
				})
				.from(portfolioHistory)
				.orderBy(desc(portfolioHistory.snapshotDate))
				.limit(1);

			if (result.length === 0) {
				return null;
			}

			const snapshot = result[0];
			return {
				id: snapshot.id,
				totalValueUsd: snapshot.totalValueUsd,
				totalValueVnd: snapshot.totalValueVnd,
				snapshotDate: snapshot.snapshotDate,
			};
		} catch (error) {
			console.error("Error fetching latest portfolio snapshot:", error);
			return null;
		}
	}

	// Calculate portfolio change for a time range
	async getPortfolioChange(range: TimeRange = "1D", userId?: string): Promise<{
		currentValue: number;
		previousValue: number;
		change: number;
		changePercent: number;
	} | null> {
		try {
			const history = await this.getHistory(range, userId);

			if (history.length === 0) {
				return null;
			}

			const latest = await this.getLatestSnapshot(userId);
			if (!latest) {
				return null;
			}

			const currentValue = latest.totalValueUsd;
			const previousValue = history[0].totalValueUsd; // First value in time range
			const change = currentValue - previousValue;
			const changePercent = previousValue > 0 ? (change / previousValue) * 100 : 0;

			return {
				currentValue,
				previousValue,
				change,
				changePercent,
			};
		} catch (error) {
			console.error(`Error calculating portfolio change for range ${range}:`, error);
			return null;
		}
	}

	// Clean up old snapshots (optional, for maintenance)
	async cleanupOldSnapshots(daysToKeep: number = 90): Promise<void> {
		try {
			const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

			await db
				.delete(portfolioHistory)
				.where(sql`${portfolioHistory.snapshotDate} < ${cutoffDate.getTime()}`);

			console.log(`Cleaned up portfolio snapshots older than ${daysToKeep} days`);
		} catch (error) {
			console.error("Error cleaning up old portfolio snapshots:", error);
		}
	}
}

export const portfolioHistoryService = new PortfolioHistoryService();