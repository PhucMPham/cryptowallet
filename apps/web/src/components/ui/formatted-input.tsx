import * as React from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

export interface FormattedInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  thousandSeparator?: boolean;
  decimalScale?: number;
}

export const FormattedInput = React.forwardRef<HTMLInputElement, FormattedInputProps>(
  ({ className, value = "", onChange, onBlur, thousandSeparator = true, decimalScale = 2, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState("");
    const [isFocused, setIsFocused] = React.useState(false);

    // Format number with thousand separators
    const formatNumber = (num: string): string => {
      if (!num || num === "") return "";

      // Remove existing separators
      const cleanNum = num.replace(/,/g, "");

      // Check if it's a valid number
      if (isNaN(Number(cleanNum))) return displayValue;

      // Split into integer and decimal parts
      const parts = cleanNum.split(".");
      let integerPart = parts[0];
      const decimalPart = parts[1];

      // Add thousand separators to integer part
      if (thousandSeparator && !isFocused) {
        integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      }

      // Rebuild the number
      let formatted = integerPart;
      if (decimalPart !== undefined) {
        formatted += "." + decimalPart.slice(0, decimalScale);
      }

      return formatted;
    };

    // Parse display value back to raw number
    const parseValue = (val: string): string => {
      return val.replace(/,/g, "");
    };

    // Update display value when prop value changes
    React.useEffect(() => {
      if (!isFocused) {
        setDisplayValue(formatNumber(value));
      }
    }, [value, isFocused]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;

      // Allow only numbers, decimal point, and thousand separator
      if (!/^[\d,]*\.?\d*$/.test(inputValue)) return;

      // Remove commas for the actual value
      const rawValue = parseValue(inputValue);

      // Update display value
      setDisplayValue(inputValue);

      // Call parent onChange with raw number value
      if (onChange) {
        onChange(rawValue);
      }
    };

    const handleFocus = () => {
      setIsFocused(true);
      // Remove formatting when focused for easier editing
      setDisplayValue(parseValue(displayValue));
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      // Apply formatting when losing focus
      const formatted = formatNumber(parseValue(displayValue));
      setDisplayValue(formatted);

      if (onBlur) {
        onBlur(e);
      }
    };

    return (
      <Input
        ref={ref}
        type="text"
        className={cn(className)}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
    );
  }
);

FormattedInput.displayName = "FormattedInput";