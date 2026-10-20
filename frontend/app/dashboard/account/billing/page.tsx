"use client";

import { useEffect, useState, useLayoutEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Check, CreditCard, Sparkles } from "lucide-react";
import { useSession } from "@/providers/session-provider";
import { redirect, RedirectType } from "next/navigation";
import { useGetCard, useGetSubscription } from "@/lib/queries/subscriptions";
import {
  useCancelSubscription,
  useUpdateSubscription,
  useUpdateCard,
} from "@/lib/mutations/subscriptions";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import CardForm from "@/components/card-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { OctagonAlert } from "lucide-react";
import validator from "validator";
import { getErrorMessage } from "@/lib/error-messages";

export default function Billing() {
  const session = useSession();
  const isFreePlan = session.user.type === "free";
  const [billingCycle, setBillingCycle] = useState<string>("");
  const [showSaveChanges, setShowSaveChanges] = useState<boolean>(false);
  const [currentBillingCycle, setCurrentBillingCycle] = useState<string>("");
  const [cardNumber, setCardNumber] = useState<string>("");
  const [expirationDate, setExpirationDate] = useState<string>("");
  const [cvc, setCvc] = useState<string>("");
  const [cardholderName, setCardholderName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [showError, setShowError] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const subscription = useGetSubscription(session.user._id);
  const card = useGetCard(session.user._id);
  const cancelSubscription = useCancelSubscription();
  const updateSubscription = useUpdateSubscription();
  const updateCard = useUpdateCard();
  const { toast } = useToast();

  useLayoutEffect(() => {
    if (session.user.type === "anonymous") {
      redirect("/login", RedirectType.replace);
    }
  }, [session.user.type]);

  useEffect(() => {
    // Set billingCycle and currentBillingCycle based on subscription data
    if (subscription.data?.interval === 1) {
      setBillingCycle("monthly");
      setCurrentBillingCycle("monthly");
    } else {
      setBillingCycle("annually");
      setCurrentBillingCycle("annually");
    }
  }, [subscription.data]); // Runs when subscription data changes

  useEffect(() => {
    // Check if billingCycle is different from the currentBillingCycle
    if (billingCycle !== currentBillingCycle) {
      setShowSaveChanges(true);
    } else {
      setShowSaveChanges(false);
    }
  }, [billingCycle, currentBillingCycle]);

  function handleSaveChanges() {
    updateSubscription.mutate(
      {
        user_id: session.user._id,
        interval: billingCycle === "monthly" ? 1 : 12,
      },
      {
        onSuccess: () => {
          toast({
            title: "Subscription updated",
            description: "Your subscription has been successfully updated",
          });
          // reload page
          window.location.reload();
        },
        onError: (error) => {
          const { title, description } = getErrorMessage("billing", error);
          toast({
            title,
            description,
            variant: "destructive",
          });
        },
      },
    );
  }

  useEffect(() => {
    const cardNumberRegex = /^[0-9]{16}$/; // Exactly 16 digits
    const expirationDateRegex = /^(0[1-9]|1[0-2])\/\d{2}$/; // MM/YY format
    const cvcRegex = /^[0-9]{3,4}$/; // 3-4 digits
    const nameRegex = /^[a-zA-Z\s]+$/; // Letters and spaces

    if (cardNumber === "") {
      setError("Card number is required");
    } else if (!cardNumberRegex.test(cardNumber)) {
      setError("Invalid card number. It must be exactly 16 digits.");
    } else if (!validator.isCreditCard(cardNumber)) {
      setError("Invalid card number.");
    } else if (expirationDate === "") {
      setError("Expiration date is required");
    } else if (!expirationDateRegex.test(expirationDate)) {
      setError("Invalid expiration date. Use MM/YY format.");
    } else {
      // Validate expiration date is not in the past
      const [month, year] = expirationDate.split("/");
      const currentYear = new Date().getFullYear() % 100; // Last two digits of current year
      const currentMonth = new Date().getMonth() + 1; // 0-based index
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
        setError(null); // All validations passed
      }
    }
  }, [cardNumber, expirationDate, cvc, cardholderName]);

  function handleCancelSubscription() {
    cancelSubscription.mutate(session.user._id, {
      onSuccess: () => {
        toast({
          title: "Subscription canceled",
          description: "Your subscription has been successfully canceled",
        });
        // reload page
        window.location.reload();
      },
      onError: (error) => {
        const { title, description } = getErrorMessage("billing", error);
        toast({
          title,
          description,
          variant: "destructive",
        });
      },
    });
  }

  function handleSaveCard() {
    setShowError(true);
    if (error) return;

    const [month, year] = expirationDate.split("/");
    updateCard.mutate(
      {
        card: {
          cardHolderName: cardholderName,
          cardNumber: cardNumber,
          expiryMonth: month,
          expiryYear: year,
          cvc: parseInt(cvc),
        },
        user_id: session.user._id,
      },
      {
        onSuccess: () => {
          toast({
            title: "Card updated",
            description: "Your card has been successfully updated",
          });
          // reload page
          window.location.reload();
        },
        onError: (error) => {
          const { title, description } = getErrorMessage("billing", error);
          toast({
            title,
            description,
            variant: "destructive",
          });
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
      setError(null);
      setShowError(false);
    }
  }, [isOpen]);

  if (session.user.type !== "anonymous")
    return (
      <div className="max-w-4xl space-y-4 sm:space-y-8">
        {/* Current Plan Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Current Plan</CardTitle>
                <CardDescription>
                  Manage your subscription and billing
                </CardDescription>
              </div>
              <Badge variant={isFreePlan ? "secondary" : "default"}>
                {isFreePlan ? "Free Plan" : "Premium Plan"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isFreePlan ? (
              <div className="rounded-lg bg-muted p-6">
                <h3 className="font-medium">
                  You are currently on the Free plan
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Upgrade to Premium to unlock all features and remove
                  limitations
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Next billing date</div>
                    <div className="text-sm text-muted-foreground">
                      {subscription.data?.expiresAt
                        ? new Date(
                            subscription.data.expiresAt,
                          ).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "No expiration date"}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Amount</div>
                    <div className="text-sm text-muted-foreground">
                      ${billingCycle === "monthly" ? "10/month" : "100/year"}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Billing cycle</div>
                    <Select
                      value={billingCycle}
                      onValueChange={setBillingCycle}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select billing cycle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="annually">Annually</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center space-x-4">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      Visa ending in {card.data?.last4}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Expires {card.data?.expiryMonth}/{card.data?.expiryYear}
                    </p>
                  </div>
                  <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Update
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Update Card</DialogTitle>
                      </DialogHeader>
                      <DialogDescription>
                        Update your card information
                      </DialogDescription>
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
                          variant="outline"
                          onClick={() => setIsOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button onClick={handleSaveCard}>Save Changes</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            )}
          </CardContent>
          {!isFreePlan && (
            <CardFooter className="flex justify-between">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">Cancel Subscription</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you sure you want to cancel?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. You{"'"}ll lose access to
                      all premium features at the end of your current billing
                      cycle.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Nevermind</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancelSubscription}>
                      Yes, Cancel Subscription
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                variant={showSaveChanges ? "default" : "secondary"}
                disabled={!showSaveChanges}
                onClick={handleSaveChanges}
              >
                Save Changes
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* Premium Plan Features Card */}
        {isFreePlan && (
          <Card>
            <CardHeader>
              <CardTitle>Premium Plan</CardTitle>
              <CardDescription>
                Get access to all features with our Premium plan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border p-6">
                <div className="flex items-baseline justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold">$10</h3>
                    <p className="text-sm text-muted-foreground">per month</p>
                  </div>
                  <Badge variant="default">Most Popular</Badge>
                </div>
                <Separator className="my-4" />
                <ul className="space-y-3">
                  {[
                    "Unlimited access to AI features",
                    "Unlimited projects",
                    "No operation limits",
                    "More storage",
                    "Priority support",
                  ].map((feature) => (
                    <li key={feature} className="flex items-center">
                      <Check className="h-4 w-4 text-primary mr-2" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
            <CardFooter>
              <Link href="/dashboard/account/upgrade" className="w-full">
                <Button className="w-full" size="lg">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Get Premium Now
                </Button>
              </Link>
            </CardFooter>
          </Card>
        )}
      </div>
    );
}
