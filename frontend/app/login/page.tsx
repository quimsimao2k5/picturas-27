"use client";

import { LoginForm } from "@/components/authentication/login-form";
import Image from "next/image";
import { useEffect, useState, useLayoutEffect } from "react";
import { useSession } from "@/providers/session-provider";
import { redirect, RedirectType } from "next/navigation";
import { useSearchParams, useRouter } from "next/navigation";

export default function Login() {
  const [seed, setSeed] = useState<number | null>(null);
  const session = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const next = searchParams.get("next") || "/dashboard";


  useEffect(() => {
    setSeed(Math.floor(Math.random() * 100));
  }, []);

  useLayoutEffect(() => {
    if (session.user.type !== "anonymous") {
      router.replace(next);
    }
  }, [session.user.type, next, router]);


  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      {seed !== null && (
        <Image
          src={`https://picsum.photos/seed/${seed}/1920/1080`}
          height={1000}
          width={1000}
          className="absolute left-0 top-0 h-screen w-screen object-cover"
          alt="Cover"
        />
      )}
      <div className="absolute left-0 top-0 h-screen w-screen bg-white bg-opacity-50 dark:bg-black backdrop-blur-sm" />
      <div className="w-full max-w-sm md:max-w-3xl z-10">
        <LoginForm />
      </div>
    </div>
  );
}
