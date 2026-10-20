"use client";

import { useState, useLayoutEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X } from "lucide-react";
import { useSession } from "@/providers/session-provider";
import { redirect, RedirectType } from "next/navigation";
import { UpgradeDialog } from "@/components/upgrade-dialog";

const plans = [
  {
    name: "free",
    price: { monthly: 0, annually: 0 },
    features: [
      { name: "Basic features", included: true },
      { name: "Unlimited access to AI-powered features", included: false },
      { name: "Up to 3 projects", included: true },
      { name: "No operation limits", included: false },
      { name: "Up to 2GB of storage", included: true },
      { name: "Priority support", included: false },
    ],
  },
  {
    name: "premium",
    price: { monthly: 10, annually: 100 },
    features: [
      { name: "Basic features", included: true },
      { name: "Unlimited access to AI-powered features", included: true },
      { name: "Unlimited projects", included: true },
      { name: "No operation limits", included: true },
      { name: "Up to 50GB of storage", included: true },
      { name: "Priority support", included: true },
    ],
  },
];

export default function Upgrade() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annually">(
    "monthly",
  );
  const session = useSession();

  useLayoutEffect(() => {
    if (session.user.type === "anonymous" || session.user.type === "premium") {
      redirect("/login", RedirectType.replace);
    }
  }, [session.user.type]);

  if (session.user.type !== "anonymous" && session.user.type !== "premium")
    return (
      <div className="space-y-4 sm:space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Upgrade to Premium</h1>
          <p className="text-muted-foreground">
            Choose the plan that{"'"}s right for you
          </p>
        </div>

        <Tabs
          defaultValue="monthly"
          className="w-full"
          onValueChange={(value) =>
            setBillingCycle(value as "monthly" | "annually")
          }
        >
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="annually">Annually</TabsTrigger>
          </TabsList>
          <TabsContent value="monthly">
            <p className="text-center text-muted-foreground mt-2">
              Pay monthly, cancel anytime
            </p>
          </TabsContent>
          <TabsContent value="annually">
            <p className="text-center text-muted-foreground mt-2">
              Pay annually, save 17%
            </p>
          </TabsContent>
        </Tabs>

        <div className="grid gap-4 sm:gap-8 md:grid-cols-2">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={plan.name === "premium" ? "border-primary" : ""}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {plan.name.toLocaleUpperCase()}
                  {plan.name === "premium" && <Badge>Recommended</Badge>}
                </CardTitle>
                <CardDescription>
                  {plan.name === "free"
                    ? "Limited access to features"
                    : "Full access to all features"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-bold">
                  ${plan.price[billingCycle]}
                  <span className="text-sm font-normal text-muted-foreground">
                    {billingCycle === "monthly" ? "/month" : "/year"}
                  </span>
                </div>
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature.name} className="flex items-center">
                      {feature.included ? (
                        <Check className="h-4 w-4 text-primary mr-2" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground mr-2" />
                      )}
                      <span
                        className={
                          feature.included ? "" : "text-muted-foreground"
                        }
                      >
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {plan.name === session.user.type ? (
                  <Button className="w-full" variant="outline" disabled={true}>
                    Current Plan
                  </Button>
                ) : (
                  <UpgradeDialog
                    className="w-full"
                    billingCycle={billingCycle}
                  />
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
        {/* <div className="bg-muted p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">
            Why upgrade to Premium?
          </h2>
          <ul className="space-y-2">
            <li className="flex items-center">
              <Check className="h-4 w-4 text-primary mr-2" />
              <span>Unlimited projects and collaborators</span>
            </li>
            <li className="flex items-center">
              <Check className="h-4 w-4 text-primary mr-2" />
              <span>Priority support with 24/7 availability</span>
            </li>
            <li className="flex items-center">
              <Check className="h-4 w-4 text-primary mr-2" />
              <span>Advanced analytics and reporting</span>
            </li>
            <li className="flex items-center">
              <Check className="h-4 w-4 text-primary mr-2" />
              <span>Custom domain and branding options</span>
            </li>
          </ul>
        </div> */}
      </div>
    );
}
