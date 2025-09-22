"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/utils/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { FormattedInput } from "@/components/ui/formatted-input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";

const formSchema = z.object({
  type: z.enum(["buy", "sell"]),
  crypto: z.string().default("USDT"),
  cryptoAmount: z.string().min(1, "Amount is required"),
  fiatCurrency: z.string().default("VND"),
  fiatAmount: z.string().min(1, "Total amount is required"),
  exchangeRate: z.string().min(1, "Exchange rate is required"),
  platform: z.string().optional(),
  counterparty: z.string().optional(),
  paymentMethod: z.string().optional(),
  bankName: z.string().optional(),
  transactionId: z.string().optional(),
  notes: z.string().optional(),
  transactionDate: z.date(),
});

interface AddP2PTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  editTransaction?: any;
}

export function AddP2PTransactionDialog({
  open,
  onOpenChange,
  onSuccess,
  editTransaction,
}: AddP2PTransactionDialogProps) {
  const [isCalculating, setIsCalculating] = useState(false);
  const [autoCalculatedField, setAutoCalculatedField] = useState<"cryptoAmount" | "exchangeRate" | null>(null);
  const programmaticUpdateRef = useRef<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "buy",
      crypto: "USDT",
      fiatCurrency: "VND",
      cryptoAmount: "",
      fiatAmount: "",
      exchangeRate: "",
      platform: "Binance P2P",
      paymentMethod: "Bank Transfer",
      bankName: "",
      counterparty: "",
      transactionId: "",
      notes: "",
      transactionDate: new Date(),
    },
  });

  const addTransaction = api.p2p.addTransaction.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "P2P transaction added successfully",
      });
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add transaction",
        variant: "destructive",
      });
    },
  });

  const updateTransaction = api.p2p.updateTransaction.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "P2P transaction updated successfully",
      });
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update transaction",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const payload = {
      ...values,
      cryptoAmount: parseFloat(values.cryptoAmount),
      fiatAmount: parseFloat(values.fiatAmount),
      exchangeRate: parseFloat(values.exchangeRate),
    };

    if (editTransaction) {
      updateTransaction.mutate({
        id: editTransaction.id,
        ...payload,
      });
    } else {
      addTransaction.mutate(payload);
    }
  };

  // Helper function to format number with proper precision
  const formatNumber = (num: number, decimals: number = 2): string => {
    // Handle very small numbers
    if (num < 0.01 && num > 0) {
      return num.toFixed(6);
    }
    // Handle normal numbers
    return num.toFixed(decimals);
  };

  // Populate form when editing
  useEffect(() => {
    if (editTransaction && open) {
      form.reset({
        type: editTransaction.type,
        crypto: editTransaction.crypto,
        cryptoAmount: editTransaction.cryptoAmount.toString(),
        fiatCurrency: editTransaction.fiatCurrency,
        fiatAmount: editTransaction.fiatAmount.toString(),
        exchangeRate: editTransaction.exchangeRate.toString(),
        platform: editTransaction.platform || "",
        counterparty: editTransaction.counterparty || "",
        paymentMethod: editTransaction.paymentMethod || "",
        bankName: editTransaction.bankName || "",
        transactionId: editTransaction.transactionId || "",
        notes: editTransaction.notes || "",
        transactionDate: new Date(editTransaction.transactionDate),
      });
    } else if (!editTransaction && open) {
      form.reset({
        type: "buy",
        crypto: "USDT",
        fiatCurrency: "VND",
        cryptoAmount: "",
        fiatAmount: "",
        exchangeRate: "",
        platform: "Binance P2P",
        paymentMethod: "Bank Transfer",
        bankName: "",
        counterparty: "",
        transactionId: "",
        notes: "",
        transactionDate: new Date(),
      });
    }
  }, [editTransaction, open, form]);

  // Auto-calculate exchange rate or USDT amount based on input
  useEffect(() => {
    let isUpdating = false;

    const subscription = form.watch((value, { name }) => {
      // Skip if we're already updating to prevent loops
      if (isUpdating || !name) return;

      const cryptoAmount = parseFloat(value.cryptoAmount || "0");
      const fiatAmount = parseFloat(value.fiatAmount || "0");
      const exchangeRate = parseFloat(value.exchangeRate || "0");

      // When VND amount or exchange rate changes, calculate USDT
      if ((name === "fiatAmount" || name === "exchangeRate") &&
          fiatAmount > 0 && exchangeRate > 0) {
        const calculatedCryptoAmount = fiatAmount / exchangeRate;
        const formatted = formatNumber(calculatedCryptoAmount, calculatedCryptoAmount < 100 ? 4 : 2);

        // Only update if the value is different
        if (formatted !== value.cryptoAmount) {
          isUpdating = true;
          form.setValue("cryptoAmount", formatted, { shouldValidate: false });
          setAutoCalculatedField("cryptoAmount");
          setTimeout(() => { isUpdating = false; }, 100);
        }
      }
      // When USDT amount changes, calculate exchange rate if VND is present
      else if (name === "cryptoAmount" &&
               cryptoAmount > 0 && fiatAmount > 0) {
        const rate = fiatAmount / cryptoAmount;
        const formatted = formatNumber(rate, 0);

        // Only update if the value is different
        if (formatted !== value.exchangeRate) {
          isUpdating = true;
          form.setValue("exchangeRate", formatted, { shouldValidate: false });
          setAutoCalculatedField("exchangeRate");
          setTimeout(() => { isUpdating = false; }, 100);
        }
      }
      // Clear auto-calculated field indicator when user modifies it directly
      else if (name === autoCalculatedField) {
        setAutoCalculatedField(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, autoCalculatedField]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{editTransaction ? "Edit P2P Transaction" : "Add P2P Transaction"}</DialogTitle>
          <DialogDescription>
            {editTransaction ? "Update your P2P USDT transaction details" : "Record your P2P USDT purchase or sale with VND exchange rate"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="buy">Buy</SelectItem>
                        <SelectItem value="sell">Sell</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="transactionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cryptoAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      USDT Amount
                      {autoCalculatedField === "cryptoAmount" && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (auto-calculated)
                        </span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <FormattedInput
                        placeholder="1,000.00"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        thousandSeparator={true}
                        decimalScale={6}
                        className={autoCalculatedField === "cryptoAmount" ? "bg-muted/50" : ""}
                      />
                    </FormControl>
                    {field.value && parseFloat(field.value) > 0 && (
                      <p className="text-xs text-muted-foreground">
                        ≈ ${(parseFloat(field.value) * 1).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fiatAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>VND Amount</FormLabel>
                    <FormControl>
                      <FormattedInput
                        placeholder="25,000,000"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        thousandSeparator={true}
                        decimalScale={0}
                        className={field.value && parseFloat(field.value) > 1000000000 ? "text-orange-600" : ""}
                      />
                    </FormControl>
                    {field.value && parseFloat(field.value) > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {parseFloat(field.value).toLocaleString("vi-VN")} ₫
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="exchangeRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Exchange Rate (VND/USDT)
                    {autoCalculatedField === "exchangeRate" && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (auto-calculated)
                      </span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <FormattedInput
                      placeholder="25,000"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      thousandSeparator={true}
                      decimalScale={0}
                      className={autoCalculatedField === "exchangeRate" ? "bg-muted/50" : ""}
                    />
                  </FormControl>
                  <FormDescription>
                    {field.value && parseFloat(field.value) > 0 ? (
                      <>1 USDT = {parseFloat(field.value).toLocaleString("vi-VN")} ₫</>
                    ) : (
                      "Enter exchange rate or it will be auto-calculated"
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="platform"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Platform</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Binance P2P">Binance P2P</SelectItem>
                        <SelectItem value="OKX P2P">OKX P2P</SelectItem>
                        <SelectItem value="Bybit P2P">Bybit P2P</SelectItem>
                        <SelectItem value="Huobi P2P">Huobi P2P</SelectItem>
                        <SelectItem value="OTC">OTC</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="E-wallet">E-wallet</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Name (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Vietcombank, Techcombank" value={field.value || ""} onChange={field.onChange} onBlur={field.onBlur} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="counterparty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Counterparty (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Seller/Buyer name" value={field.value || ""} onChange={field.onChange} onBlur={field.onBlur} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="transactionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transaction ID (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Reference or order ID" value={field.value || ""} onChange={field.onChange} onBlur={field.onBlur} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional notes..."
                      className="resize-none"
                      value={field.value || ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addTransaction.isPending || updateTransaction.isPending}>
                {editTransaction
                  ? (updateTransaction.isPending ? "Updating..." : "Update Transaction")
                  : (addTransaction.isPending ? "Adding..." : "Add Transaction")
                }
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}