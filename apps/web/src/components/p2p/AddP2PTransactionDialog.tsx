"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('p2p');
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
        description: t('messages.addSuccess'),
      });
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || t('messages.addError'),
        variant: "destructive",
      });
    },
  });

  const updateTransaction = api.p2p.updateTransaction.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: t('messages.updateSuccess'),
      });
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || t('messages.updateError'),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const payload = {
      ...values,
      cryptoAmount: parseFormattedNumber(values.cryptoAmount),
      fiatAmount: parseFormattedNumber(values.fiatAmount),
      exchangeRate: parseFormattedNumber(values.exchangeRate),
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

  // Helper function to format number with Vietnamese format for display
  const formatNumberForDisplay = (num: number, decimals: number = 2): string => {
    // Handle very small numbers
    if (num < 0.01 && num > 0) {
      decimals = 6;
    }
    // Format with Vietnamese style (dot for thousands, comma for decimal)
    return new Intl.NumberFormat("vi-VN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  // Helper to parse Vietnamese formatted numbers
  const parseFormattedNumber = (value: string): number => {
    if (!value) return 0;
    // Vietnamese format: 1.234.567,89 (dots for thousands, comma for decimal)
    // First, replace dots (thousand separators) with nothing
    // Then replace comma (decimal separator) with dot for parsing
    const cleanValue = value.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleanValue) || 0;
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

      const cryptoAmount = parseFormattedNumber(value.cryptoAmount || "0");
      const fiatAmount = parseFormattedNumber(value.fiatAmount || "0");
      const exchangeRate = parseFormattedNumber(value.exchangeRate || "0");

      // When VND amount or exchange rate changes, calculate USDT
      if ((name === "fiatAmount" || name === "exchangeRate") &&
          fiatAmount > 0 && exchangeRate > 0) {
        const calculatedCryptoAmount = fiatAmount / exchangeRate;
        const formatted = formatNumberForDisplay(calculatedCryptoAmount, calculatedCryptoAmount < 100 ? 4 : 2);

        // Compare parsed values instead of formatted strings
        const currentValue = parseFormattedNumber(value.cryptoAmount || "0");
        if (Math.abs(calculatedCryptoAmount - currentValue) > 0.0001) {
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
        const formatted = formatNumberForDisplay(rate, 0);

        // Compare parsed values instead of formatted strings
        const currentRate = parseFormattedNumber(value.exchangeRate || "0");
        if (Math.abs(rate - currentRate) > 0.01) {
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
          <DialogTitle>{editTransaction ? t('dialog.editTitle') : t('dialog.addTitle')}</DialogTitle>
          <DialogDescription>
            {editTransaction ? t('dialog.editDescription') : t('dialog.addDescription')}
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
                    <FormLabel>{t('dialog.transactionType')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('dialog.selectType')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="buy">{t('dialog.buy')}</SelectItem>
                        <SelectItem value="sell">{t('dialog.sell')}</SelectItem>
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
                    <FormLabel>{t('dialog.transactionDate')}</FormLabel>
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
                              <span>{t('dialog.pickDate')}</span>
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
                      {t('dialog.usdtAmount')}
                      {autoCalculatedField === "cryptoAmount" && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {t('dialog.autoCalculated')}
                        </span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <FormattedInput
                        placeholder="1.000,00"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        thousandSeparator="."
                        decimalSeparator=","
                        decimalScale={2}
                        className={autoCalculatedField === "cryptoAmount" ? "bg-muted/50" : ""}
                      />
                    </FormControl>
                    {field.value && parseFormattedNumber(field.value) > 0 && (
                      <p className="text-xs text-muted-foreground">
                        ≈ ${(parseFormattedNumber(field.value) * 1).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
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
                    <FormLabel>{t('dialog.vndAmount')}</FormLabel>
                    <FormControl>
                      <FormattedInput
                        placeholder="25.000.000"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        thousandSeparator="."
                        decimalSeparator=","
                        decimalScale={0}
                        className={field.value && parseFormattedNumber(field.value) > 1000000000 ? "text-orange-600" : ""}
                      />
                    </FormControl>
                    {field.value && parseFormattedNumber(field.value) > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {parseFormattedNumber(field.value).toLocaleString("vi-VN")} ₫
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
                    {t('dialog.exchangeRate')}
                    {autoCalculatedField === "exchangeRate" && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {t('dialog.autoCalculated')}
                      </span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <FormattedInput
                      placeholder="25.000"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      thousandSeparator="."
                      decimalSeparator=","
                      decimalScale={0}
                      className={autoCalculatedField === "exchangeRate" ? "bg-muted/50" : ""}
                    />
                  </FormControl>
                  <FormDescription>
                    {field.value && parseFormattedNumber(field.value) > 0 ? (
                      <>{t('dialog.exchangeRateDisplay', { rate: parseFormattedNumber(field.value).toLocaleString("vi-VN") })}</>
                    ) : (
                      t('dialog.exchangeRateDescription')
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
                    <FormLabel>{t('dialog.platform')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('dialog.selectPlatform')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Binance P2P">{t('platforms.binanceP2P')}</SelectItem>
                        <SelectItem value="OKX P2P">{t('platforms.okxP2P')}</SelectItem>
                        <SelectItem value="Bybit P2P">{t('platforms.bybitP2P')}</SelectItem>
                        <SelectItem value="Huobi P2P">{t('platforms.huobiP2P')}</SelectItem>
                        <SelectItem value="OTC">{t('platforms.otc')}</SelectItem>
                        <SelectItem value="Other">{t('platforms.other')}</SelectItem>
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
                    <FormLabel>{t('dialog.paymentMethod')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('dialog.selectMethod')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Bank Transfer">{t('paymentMethods.bankTransfer')}</SelectItem>
                        <SelectItem value="Cash">{t('paymentMethods.cash')}</SelectItem>
                        <SelectItem value="E-wallet">{t('paymentMethods.eWallet')}</SelectItem>
                        <SelectItem value="Other">{t('paymentMethods.other')}</SelectItem>
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
                    <FormLabel>{t('dialog.bankName')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('dialog.bankPlaceholder')} value={field.value || ""} onChange={field.onChange} onBlur={field.onBlur} />
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
                    <FormLabel>{t('dialog.counterparty')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('dialog.counterpartyPlaceholder')} value={field.value || ""} onChange={field.onChange} onBlur={field.onBlur} />
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
                  <FormLabel>{t('dialog.transactionId')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('dialog.transactionIdPlaceholder')} value={field.value || ""} onChange={field.onChange} onBlur={field.onBlur} />
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
                  <FormLabel>{t('dialog.notes')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('dialog.notesPlaceholder')}
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
                {t('dialog.cancel')}
              </Button>
              <Button type="submit" disabled={addTransaction.isPending || updateTransaction.isPending}>
                {editTransaction
                  ? (updateTransaction.isPending ? t('dialog.updating') : t('dialog.updateButton'))
                  : (addTransaction.isPending ? t('dialog.adding') : t('dialog.addButton'))
                }
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}