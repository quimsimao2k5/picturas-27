"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LoaderCircle, OctagonAlert } from "lucide-react";
import { useSubscribe } from "@/lib/mutations/subscriptions";
import { useSession } from "@/providers/session-provider";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import CardForm from "@/components/card-form";
import validator from "validator";
import { getErrorMessage } from "@/lib/error-messages";

export function UpgradeDialog({
  className,
  billingCycle,
}: {
  className?: string;
  billingCycle: "monthly" | "annually";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [cardNumber, setCardNumber] = useState<string>("");
  const [expirationDate, setExpirationDate] = useState<string>("");
  const [cvc, setCvc] = useState<string>("");
  const [cardholderName, setCardholderName] = useState<string>("");
  const [billingCycleValue, setBillingCycleValue] = useState<string>("monthly");
  const [error, setError] = useState<string | null>(null);
  const [showError, setShowError] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const subscribe = useSubscribe();
  const session = useSession();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setBillingCycleValue(billingCycle);
  }, [billingCycle]);

useEffect(() => {
  const cleanCardNumber = cardNumber.replace(/\D/g, ""); // permite espaços
  const cleanExpiry = expirationDate.replace(/\D/g, ""); // permite 0326

  const expirationDateRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
  const cvcRegex = /^[0-9]{3,4}$/;
  const nameRegex = /^[a-zA-Z\s]+$/;

  // normalizar expiry para MM/YY
  let normalizedExpiry = expirationDate;
  if (cleanExpiry.length === 4) {
    normalizedExpiry = `${cleanExpiry.slice(0, 2)}/${cleanExpiry.slice(2)}`;
  }

  if (cleanCardNumber === "") {
    setError("Card number is required");
  } else if (cleanCardNumber.length !== 16) {
    setError("Invalid card number. It must be exactly 16 digits.");
  } else if (normalizedExpiry === "") {
    setError("Expiration date is required");
  } else if (!expirationDateRegex.test(normalizedExpiry)) {
    setError("Invalid expiration date. Use MM/YY format.");
  } else {
    const [month, year] = normalizedExpiry.split("/");
    const currentYear = new Date().getFullYear() % 100;
    const currentMonth = new Date().getMonth() + 1;

    if (
      parseInt(year) < currentYear ||
      (parseInt(year) === currentYear && parseInt(month) < currentMonth)
    ) {
      setError("Expiration date is in the past");
    } else if (cvc === "") {
      setError("CVC is required");
    } else if (!cvcRegex.test(cvc)) {
      setError("Invalid CVC. It must be 3 or 4 digits.");
    } else if (cardholderName === "") {
      setError("Cardholder name is required");
    } else if (!nameRegex.test(cardholderName)) {
      setError("Invalid cardholder name. Use only letters and spaces.");
    } else {
      setError(null);
    }
  }
}, [cardNumber, expirationDate, cvc, cardholderName]);

  function handleSubmit() {
    setShowError(true);
    if (error) return;

    setIsSubmitting(true);
    const cleanCardNumber = cardNumber.replace(/\D/g, "");
    const cleanExpiry = expirationDate.replace(/\D/g, "");
    const normalizedExpiry =
      cleanExpiry.length === 4 ? `${cleanExpiry.slice(0, 2)}/${cleanExpiry.slice(2)}` : expirationDate;

    const [month, year] = normalizedExpiry.split("/");
    subscribe.mutate(
      {
        card: {
          cardHolderName: cardholderName,
          cardNumber: cleanCardNumber,
          expiryMonth: month,
          expiryYear: year,
          cvc: parseInt(cvc),
        },
        interval: billingCycleValue === "monthly" ? 1 : 12,
        user_id: session.user._id,
      },
      {
        onSuccess: () => {
          router.push("/dashboard/account/billing");
          window.location.reload();
        },
        onError: (error) => {
          const { title, description } = getErrorMessage("upgrade", error);
          toast({
            title,
            description,
            variant: "destructive",
          });
          setIsSubmitting(false);
        },
      },
    );
  }

  useEffect(() => {
    if (!isOpen) {
      setCardNumber("");
      setExpirationDate("");
      setCvc("");
      setCardholderName("");
      setBillingCycleValue("");
      setError(null);
      setShowError(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="w-full">Upgrade to Premium</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Upgrade Your Account to Premium</DialogTitle>
            <DialogDescription>
              Enter your credit card details securely
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Billing Cycle
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  defaultValue="monthly"
                  value={billingCycleValue}
                  onValueChange={(value) => setBillingCycleValue(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a billing cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
            <CardForm
              cardNumber={cardNumber}
              setCardNumber={setCardNumber}
              expirationDate={expirationDate}
              setExpirationDate={setExpirationDate}
              cvc={cvc}
              setCvc={setCvc}
              cardholderName={cardholderName}
              setCardholderName={setCardholderName}
            />
            {error && showError && (
              <Alert variant="destructive" className="text-sm">
                <OctagonAlert className="h-4 w-4" />
                <AlertTitle>Input Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button
                type="submit"
                className="w-full inline-flex gap-1 items-center justify-center"
                disabled={isSubmitting}
                onClick={handleSubmit}
              >
                <span>Submit</span>
                {isSubmitting && (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
