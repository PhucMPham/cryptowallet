"use client";

import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const formSchema = z.object({
  type: z.enum(["buy", "sell"]),
  quantity: z.string().min(1, "Quantity is required"),
  pricePerUnit: z.string().min(1, "Price is required"),
  fee: z.string().optional(),
  feeCurrency: z.enum(["USD", "CRYPTO"]),
  paymentSource: z.enum(["CASH", "USDT"]),
  exchange: z.string().optional(),
  notes: z.string().optional(),
  transactionDate: z.date(),
});

interface EditCryptoTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: any;
  assetSymbol: string;
  onSuccess?: () => void;
}

export function EditCryptoTransactionDialog({
  open,
  onOpenChange,
  transaction,
  assetSymbol,
  onSuccess,
}: EditCryptoTransactionDialogProps) {
  const t = useTranslations('cryptoDetail');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: transaction?.type || "buy",
      quantity: "",
      pricePerUnit: "",
      fee: "",
      feeCurrency: "USD",
      paymentSource: "CASH",
      exchange: "",
      notes: "",
      transactionDate: new Date(),
    },
  });

  // Update form when transaction changes
  useEffect(() => {
    if (transaction) {
      // Determine payment source based on totalAmount or notes
      const isUsdtPayment = transaction.totalAmount === 0 ||
                           transaction.notes?.includes("Purchased with USDT");

      form.reset({
        type: transaction.type,
        quantity: transaction.quantity?.toString() || "",
        pricePerUnit: transaction.pricePerUnit?.toString() || "",
        fee: transaction.fee?.toString() || "",
        feeCurrency: transaction.feeCurrency || "USD",
        paymentSource: isUsdtPayment ? "USDT" : "CASH",
        exchange: transaction.exchange || "",
        notes: transaction.notes?.replace(" - Purchased with USDT", "") || "",
        transactionDate: new Date(transaction.transactionDate),
      });
    }
  }, [transaction, form]);

  const utils = api.useContext();

  const updateTransaction = api.crypto.updateTransaction.useMutation({
    onSuccess: () => {
      toast({
        title: t('updateSuccess'),
        description: t('transactionUpdated'),
      });
      utils.crypto.getTransactionsByAssetId.invalidate();
      utils.crypto.getAssetById.invalidate();
      utils.crypto.getAssets.invalidate();
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: t('updateError'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTransaction = api.crypto.deleteTransaction.useMutation({
    onSuccess: () => {
      toast({
        title: t('deleteSuccess'),
        description: t('transactionDeleted'),
      });
      utils.crypto.getTransactionsByAssetId.invalidate();
      utils.crypto.getAssetById.invalidate();
      utils.crypto.getAssets.invalidate();
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: t('deleteError'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!transaction?.id) return;

    // Prepare notes based on payment source
    let notes = values.notes || "";
    if (values.paymentSource === "USDT" && values.type === "buy") {
      // Add USDT payment note if not already present
      if (!notes.includes("Purchased with USDT")) {
        notes = notes ? `${notes} - Purchased with USDT` : "Purchased with USDT";
      }
    } else {
      // Remove USDT payment note if switching to cash
      notes = notes.replace(/ - Purchased with USDT|Purchased with USDT/g, "").trim();
    }

    updateTransaction.mutate({
      id: transaction.id,
      type: values.type,
      quantity: parseFloat(values.quantity),
      pricePerUnit: parseFloat(values.pricePerUnit),
      fee: values.fee ? parseFloat(values.fee) : 0,
      feeCurrency: values.feeCurrency,
      totalAmount: values.paymentSource === "USDT" && values.type === "buy" ? 0 :
                   parseFloat(values.quantity) * parseFloat(values.pricePerUnit),
      exchange: values.exchange,
      notes: notes,
      transactionDate: values.transactionDate.toISOString(),
    });
  };

  const handleDelete = () => {
    if (!transaction?.id) return;
    deleteTransaction.mutate({ id: transaction.id });
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('editTransaction')}</DialogTitle>
            <DialogDescription>
              {t('editTransactionDesc', { asset: assetSymbol })}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('transactionType')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('selectType')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="buy">{t('buy')}</SelectItem>
                          <SelectItem value="sell">{t('sell')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentSource"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('paymentSource')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="CASH">{t('cash')}</SelectItem>
                          <SelectItem value="USDT">{t('usdtBalance')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {field.value === "USDT" && t('paidWithUsdt')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="transactionDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('date')}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>{t('pickDate')}</span>
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
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('quantity')} ({assetSymbol})</FormLabel>
                      <FormControl>
                        <Input placeholder="0.00" type="number" step="any" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pricePerUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('pricePerUnit')} (USD)</FormLabel>
                      <FormControl>
                        <Input placeholder="0.00" type="number" step="any" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fee')}</FormLabel>
                      <FormControl>
                        <Input placeholder="0.00" type="number" step="any" {...field} />
                      </FormControl>
                      <FormDescription>{t('optional')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="feeCurrency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('feeCurrency')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="CRYPTO">{assetSymbol}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="exchange"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('exchange')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('exchangePlaceholder')} {...field} />
                    </FormControl>
                    <FormDescription>{t('optional')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('notes')}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={t('notesPlaceholder')} {...field} />
                    </FormControl>
                    <FormDescription>{t('optional')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleteTransaction.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('delete')}
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    {t('cancel')}
                  </Button>
                  <Button type="submit" disabled={updateTransaction.isPending}>
                    {updateTransaction.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {t('save')}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTransaction.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}