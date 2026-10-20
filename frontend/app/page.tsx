"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Brush,
  Sparkle,
  Globe,
  ArrowRight,
  GalleryVerticalEnd,
} from "lucide-react";
import NavUser from "@/components/nav-user";
import { useSession } from "@/providers/session-provider";

export default function Home() {
  const session = useSession();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="flex justify-between items-center p-2 w-full">
          <Link href="/" className="text-2xl font-bold font-title pt-1">
            PictuRAS
          </Link>
          {session.user.type !== "anonymous" ? (
            <div className="hidden sm:block">
              <NavUser
                user={{
                  name: session.user.name ?? "",
                  email: session.user.email ?? "",
                  isPremium: session.user.type === "premium",
                }}
              />
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Sign up</Link>
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-8 md:py-16 lg:py-24">
        <div className="text-center space-y-4 sm:space-y-6 mb-8 sm:mb-12">
          <h1 className="text-7xl font-extrabold tracking-tight lg:text-8xl font-title">
            PictuRAS
          </h1>
          <p className="text-xl text-muted-foreground md:text-2xl max-w-[42rem] mx-auto">
            Your <span className="font-semibold text-primary">personal</span>,{" "}
            <span className="font-semibold text-primary">intuitive</span> and{" "}
            <span className="font-semibold text-primary">powerful</span> image
            editor.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-12">
          {[
            {
              icon: Brush,
              title: "Easy Editing",
              description: "Intuitive tools for quick edits",
            },
            {
              icon: Sparkle,
              title: "AI Tools",
              description: "Leverage AI for smart enhancements",
            },
            {
              icon: GalleryVerticalEnd,
              title: "Edit in Bulk",
              description: "Process multiple images efficiently",
            },
            {
              icon: Globe,
              title: "100% Online",
              description: "Edit anywhere, anytime",
            },
          ].map((feature, index) => (
            <Card key={index}>
              <CardHeader>
                <feature.icon className="h-8 w-8 text-primary mb-2" />
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-center">
          <Button asChild size="lg">
            <Link href="/dashboard" className="inline-flex items-center">
              Start Editing Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </main>

      <footer className="border-t py-6">
        <div className="container text-center text-sm text-muted-foreground">
          © 2025 PictuRAS. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
