"use client";

import { useState } from "react";
import { useSession } from "@/providers/session-provider";
import { useDeleteAccount } from "@/lib/mutations/session";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DeleteAccountButton() {
  const [open, setOpen] = useState(false);
  const session = useSession();
  const deleteAccount = useDeleteAccount(session.user._id, session.token);

  const handleConfirm = () => {
    deleteAccount.mutate(undefined, {
      onSuccess: () => {
        setOpen(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="destructive"
          className="w-full"
          disabled={deleteAccount.isPending}
        >
          Delete account
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete account</DialogTitle>
          <DialogDescription>
            This will permanently delete your account, projects and all
            associated images and results. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={deleteAccount.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleteAccount.isPending}
          >
            {deleteAccount.isPending ? "Deleting..." : "Confirm delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
