// Compact profile trigger with account details and sign-out kept in a dialog.
"use client";

import { ChevronDown } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ProfileDialog({
  name,
  email,
  initial,
  action,
}: {
  name: string;
  email: string | null | undefined;
  initial: string;
  action: () => Promise<void>;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="h-auto w-full justify-start gap-3 px-2 py-2">
          <Avatar>
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">{name}</span>
          <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
        </Button>
      </DialogTrigger>

      <DialogContent className="gap-6 rounded-lg p-6">
        <DialogHeader>
          <DialogTitle>Your profile</DialogTitle>
          <DialogDescription>Manage your Carely account.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3">
          <Avatar size="lg">
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">{name}</p>
            <p className="truncate text-sm text-muted-foreground">{email ?? "No email available"}</p>
          </div>
        </div>

        <form action={action}>
          <Button type="submit" variant="outline" className="w-full">
            Log out
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
