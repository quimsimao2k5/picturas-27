"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CardForm({
  cardNumber,
  setCardNumber,
  expirationDate,
  setExpirationDate,
  cvc,
  setCvc,
  cardholderName,
  setCardholderName,
}: {
  cardNumber: string;
  setCardNumber: (cardNumber: string) => void;
  expirationDate: string;
  setExpirationDate: (expirationDate: string) => void;
  cvc: string;
  setCvc: (cvc: string) => void;
  cardholderName: string;
  setCardholderName: (cardholderName: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Payment Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form>
          <div className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input
                id="cardNumber"
                placeholder="1234 5678 9012 3456"
                required
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="expirationDate">Expiration Date</Label>
                <Input
                  id="expirationDate"
                  placeholder="MM/YY"
                  required
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cvc">CVC</Label>
                <Input
                  id="cvc"
                  placeholder="123"
                  required
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cardholderName">Cardholder Name</Label>
              <Input
                id="cardholderName"
                placeholder="John Doe"
                required
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
              />
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
