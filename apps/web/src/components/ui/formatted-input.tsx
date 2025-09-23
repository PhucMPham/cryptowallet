import * as React from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

export interface FormattedInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  thousandSeparator?: boolean | string;
  decimalSeparator?: string;
  decimalScale?: number;
}

export const FormattedInput = React.forwardRef<HTMLInputElement, FormattedInputProps>(
  ({
    className,
    value = "",
    onChange,
    onBlur,
    thousandSeparator = true,
    decimalSeparator = ",",
    decimalScale = 2,
    ...props
  }, ref) => {
    const [displayValue, setDisplayValue] = React.useState("");
    const [isFocused, setIsFocused] = React.useState(false);

    // Determine separators
    const thousandSep = thousandSeparator === true ? "." :
                       thousandSeparator === false ? "" :
                       thousandSeparator || ".";
    const decimalSep = decimalSeparator || ",";

    // Format number with thousand separators (Vietnamese format)
    const formatNumber = (num: string): string => {
      if (!num || num === "") return "";

      // Remove existing thousand separators (dots in Vietnamese)
      let cleanNum = num.replace(/\./g, "");

      // Replace comma with dot for parsing (Vietnamese to standard)
      cleanNum = cleanNum.replace(/,/g, ".");

      // Check if it's a valid number
      if (isNaN(Number(cleanNum))) return displayValue;

      // Split into integer and decimal parts
      const parts = cleanNum.split(".");
      let integerPart = parts[0];
      const decimalPart = parts[1];

      // Add thousand separators to integer part
      if (thousandSep && !isFocused) {
        integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSep);
      }

      // Rebuild the number with Vietnamese format
      let formatted = integerPart;
      if (decimalPart !== undefined && decimalScale > 0) {
        formatted += decimalSep + decimalPart.slice(0, decimalScale);
      }

      return formatted;
    };

    // Parse display value back to raw number
    const parseValue = (val: string): string => {
      if (!val) return "";
      // Remove thousand separators (dots) and replace decimal comma with dot
      return val.replace(/\./g, "").replace(/,/g, ".");
    };

    // Update display value when prop value changes
    React.useEffect(() => {
      if (!isFocused) {
        // Value coming from form is already in standard format (with dots)
        // Convert it to display format
        const standardValue = value.replace(/,/g, ".");
        setDisplayValue(formatNumber(standardValue));
      }
    }, [value, isFocused]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;

      // Allow only numbers, decimal separator, and thousand separator
      const allowedPattern = new RegExp(`^[\\d${thousandSep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]*${decimalSep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}?\\d*$`);
      if (!allowedPattern.test(inputValue)) return;

      // Update display value
      setDisplayValue(inputValue);

      // Call parent onChange with value in Vietnamese format (as entered)
      if (onChange) {
        onChange(inputValue);
      }
    };

    const handleFocus = () => {
      setIsFocused(true);
      // Remove formatting when focused for easier editing
      const cleanValue = displayValue.replace(new RegExp(`\\${thousandSep}`, 'g'), '');
      setDisplayValue(cleanValue);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      // Apply formatting when losing focus
      const formatted = formatNumber(displayValue);
      setDisplayValue(formatted);

      if (onBlur) {
        onBlur(e);
      }
    };

    // Don't pass custom props to the DOM element
    const { thousandSeparator: _, decimalSeparator: __, decimalScale: ___, ...inputProps } = props;

    return (
      <Input
        ref={ref}
        type="text"
        className={cn(className)}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...inputProps}
      />
    );
  }
);

FormattedInput.displayName = "FormattedInput";