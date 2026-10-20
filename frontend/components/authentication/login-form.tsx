import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { LoaderCircle, OctagonAlert } from "lucide-react";
import { useLogin } from "@/lib/mutations/session";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-messages";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [showError, setShowError] = useState<boolean>(false);
  const login = useLogin();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (email === "") setError("Email is required");
    else if (password === "") setError("Password is required");
    else setError(null);
  }, [email, password]);

  function handleLogin() {
    setShowError(true);
    if (error) return;

    login.mutate(
      { email, password },
      {
        onSuccess: () => {
          // router.replace("/dashboard");
        },
        onError: (error) => {
          const { title, description } = getErrorMessage("auth-login", error);
          toast({
            title,
            description,
            variant: "destructive",
          });
        },
      },
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold">Welcome back</h1>
                <p className="text-balance text-muted-foreground">
                  Login to your PictuRAS account
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <a
                    href="#"
                    className="ml-auto text-sm underline-offset-2 hover:underline"
                  >
                    Forgot your password?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                className="w-full inline-flex gap-1 items-center"
                onClick={(e) => {
                  e.preventDefault();
                  handleLogin();
                }}
              >
                <span>Login</span>
                {login.isPending && (
                  <LoaderCircle className="size-[1em] animate-spin" />
                )}
              </Button>
              {error && showError && (
                <Alert variant="destructive" className="text-sm">
                  <OctagonAlert className="size-4" />
                  <AlertTitle>Input Error</AlertTitle>
                  <AlertDescription>{error}.</AlertDescription>
                </Alert>
              )}
              <div className="text-center text-sm">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="underline underline-offset-4">
                  Sign up
                </Link>
              </div>
            </div>
          </form>
          <Link
            className="relative hidden bg-primary text-background justify-center items-center md:flex flex-col p-8"
            href="/"
          >
            <h1 className="font-title text-7xl font-bold">PictuRAS</h1>
            <p className="text-center text-lg">
              Your <span className="font-semibold">personal</span>,{" "}
              <span className="font-semibold">intuitive</span> and{" "}
              <span className="font-semibold">powerful</span> image editor.
            </p>
          </Link>
        </CardContent>
      </Card>
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
        By clicking continue, you agree to our{" "}
        <Link href="/terms-of-service">Terms of Service</Link> and{" "}
        <Link href="/privacy-policy">Privacy Policy</Link>.
      </div>
    </div>
  );
}
