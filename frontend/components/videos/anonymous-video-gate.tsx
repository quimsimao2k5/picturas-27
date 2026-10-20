"use client";

// E1 / REQ-VID-LIB-048: anonymous users are informed that the video library
// requires a registered account and are redirected to sign in / sign up.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const REDIRECT_SECONDS = 5;

export default function AnonymousVideoGate() {
  const router = useRouter();
  const [seconds, setSeconds] = useState(REDIRECT_SECONDS);

  useEffect(() => {
    if (seconds <= 0) {
      router.push("/login");
      return;
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, router]);

  return (
    <div className="flex h-full items-center justify-center p-8">
      <Card className="max-w-md">
        <CardHeader className="items-center text-center">
          <Film className="size-12 text-primary" />
          <CardTitle>The video library requires a registered account</CardTitle>
          <CardDescription>
            Sign in or create a free account to upload, manage and play your videos. Redirecting to sign
            in in {seconds} s…
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button variant="outline" asChild className="flex-1">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild className="flex-1">
            <Link href="/register">Sign up</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
