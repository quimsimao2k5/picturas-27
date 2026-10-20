"use client";

import { useState, useLayoutEffect, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useSession } from "@/providers/session-provider";
import { useTheme } from "@/providers/theme-provider";
import { redirect, RedirectType } from "next/navigation";
import {
  useUpdateUserProfile,
  useUpdateUserPassword,
  useLogin,
} from "@/lib/mutations/session";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { OctagonAlert } from "lucide-react";
import { getErrorMessage } from "@/lib/error-messages";
import { DeleteAccountButton } from "@/components/settings/delete-account-button";

export default function Account() {
  const session = useSession();
  const { theme, setTheme } = useTheme();
  const isFreePlan = session.user.type === "free";
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [errorProfile, setErrorProfile] = useState<string | null>(null);
  const [errorPassword, setErrorPassword] = useState<string | null>(null);
  const [showErrorProfile, setShowErrorProfile] = useState<boolean>(false);
  const [showErrorPassword, setShowErrorPassword] = useState<boolean>(false);

  const updateUser = useUpdateUserProfile();
  const updatePassword = useUpdateUserPassword();
  const login = useLogin();
  const { toast } = useToast();

  // Set default values when the session is loaded or updated
  useEffect(() => {
    if (session) {
      setName(session.user.name || "Name");
      setEmail(session.user.email || "Email");
    }
  }, [session]);

  useEffect(() => {
    if (newPassword.length < 8 || newPassword.length > 128)
      setErrorPassword("Password must be between 8 and 128 characters");
    if (currentPassword === "")
      setErrorPassword("Current password is required");
    if (currentPassword.length < 8 || currentPassword.length > 128)
      setErrorPassword("Current password must be between 8 and 128 characters");
    if (newPassword !== confirmPassword)
      setErrorPassword("Passwords do not match");
    else setErrorPassword(null);
  }, [newPassword, confirmPassword, currentPassword]);

  useEffect(() => {
    if (name === "") setErrorProfile("Name is required");
    else if (email === "") setErrorProfile("Email is required");
    else setErrorProfile(null);
  }, [name, email]);

  function saveChangesProfile() {
    setShowErrorProfile(true);
    if (errorProfile) return;
    updateUser.mutate(
      {
        userId: session.user._id,
        token: session.token,
        name: name,
        email: email,
      },
      {
        onSuccess: () => {
          toast({
            title: "Profile updated successfully.",
          });
        },
        onError: (error) => {
          const { title, description } = getErrorMessage("account-profile", error);
          toast({
            title,
            description,
            variant: "destructive",
          });
        },
      },
    );

    setIsEditing(false);
  }

  function saveChangesPassword() {
    setShowErrorPassword(true);
    if (errorPassword) return;

    login.mutate(
      {
        email: session.user.email || "",
        password: currentPassword,
      },
      {
        onSuccess: (session) => {
          updatePassword.mutate(
            {
              userId: session.user._id,
              token: session.token,
              password: newPassword,
            },
            {
              onSuccess: () => {
                toast({
                  title: "Password updated successfully.",
                });
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
              },
              onError: (error) => {
                const { title, description } = getErrorMessage("account-password", error);
                toast({
                  title,
                  description,
                  variant: "destructive",
                });
              },
            },
          );
        },
        onError: () => {
          toast({
            title: "Incorrect password.",
            variant: "destructive",
          });
        },
      },
    );
  }

  useLayoutEffect(() => {
    if (session.user.type === "anonymous") {
      redirect("/login", RedirectType.replace);
    }
  }, [session.user.type]);

  if (session.user.type !== "anonymous")
    return (
      <div className="max-w-3xl space-y-4 sm:space-y-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your personal details</CardDescription>
              </div>
              <Badge variant={isFreePlan ? "secondary" : "default"}>
                {isFreePlan ? "Free" : "Premium"} Plan
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isEditing}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </div>

            <Button
              variant={isEditing ? "default" : "secondary"}
              onClick={() => {
                if (isEditing) {
                  saveChangesProfile();
                }
                setIsEditing(!isEditing);
              }}
            >
              {isEditing ? "Save Changes" : "Edit Profile"}
            </Button>
            {showErrorProfile && errorProfile && (
              <Alert variant="destructive" className="text-sm">
                <OctagonAlert className="size-4" />
                <AlertTitle>Input Error</AlertTitle>
                <AlertDescription>{errorProfile}.</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>Change your password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  required
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>

              <Separator />

              <div className="grid gap-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  required
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  required
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
            </div>

            <Button
              onClick={() => saveChangesPassword()}
              disabled={
                !(
                  currentPassword !== "" &&
                  newPassword !== "" &&
                  confirmPassword !== ""
                )
              }
            >
              Update Password
            </Button>
            {showErrorPassword && errorPassword && (
              <Alert variant="destructive" className="text-sm">
                <OctagonAlert className="size-4" />
                <AlertTitle>Input Error</AlertTitle>
                <AlertDescription>{errorPassword}.</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Aparência */}
        <Card>
          <CardHeader>
            <CardTitle>Aparência</CardTitle>
            <CardDescription>Escolhe entre modo claro e modo escuro.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <Label className="mb-1">Modo escuro</Label>
              <p className="text-sm text-muted-foreground">
                {theme === "dark" ? "Ativo" : "Inativo"}
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? "Desativar" : "Ativar"}
            </Button>
          </CardContent>
        </Card>

        {/* Danger Zone — FORA da grid */}
        <Card className="border-destructive/40 bg-destructive/10">
          <CardHeader>
            <CardTitle>Danger Zone</CardTitle>
            <CardDescription>
              Permanently delete your account and all associated data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Separator className="my-6" />

<DeleteAccountButton />
          </CardContent>
        </Card>
      </div>
    );
}
