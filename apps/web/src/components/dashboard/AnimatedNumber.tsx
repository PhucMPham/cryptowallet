"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedNumberProps {
	value: number;
	duration?: number;
	formatOptions?: Intl.NumberFormatOptions;
	prefix?: string;
	className?: string;
}

export function AnimatedNumber({
	value,
	duration = 1000,
	formatOptions = { minimumFractionDigits: 2, maximumFractionDigits: 2 },
	prefix = "",
	className = "",
}: AnimatedNumberProps) {
	const [displayValue, setDisplayValue] = useState(value);
	const prevValueRef = useRef(value);
	const startTimeRef = useRef<number | null>(null);
	const animationFrameRef = useRef<number | null>(null);

	useEffect(() => {
		if (value === prevValueRef.current) return;

		const startValue = prevValueRef.current;
		const endValue = value;
		const startTime = Date.now();
		startTimeRef.current = startTime;

		const animate = () => {
			const now = Date.now();
			const elapsed = now - startTime;
			const progress = Math.min(elapsed / duration, 1);

			// Easing function (ease-out)
			const easeOut = 1 - Math.pow(1 - progress, 3);

			const currentValue = startValue + (endValue - startValue) * easeOut;
			setDisplayValue(currentValue);

			if (progress < 1) {
				animationFrameRef.current = requestAnimationFrame(animate);
			} else {
				prevValueRef.current = value;
			}
		};

		animationFrameRef.current = requestAnimationFrame(animate);

		return () => {
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}
		};
	}, [value, duration]);

	const formattedValue = displayValue.toLocaleString("en-US", formatOptions);

	return (
		<span className={className}>
			{prefix}
			{formattedValue}
		</span>
	);
}
