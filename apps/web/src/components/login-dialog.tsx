"use client";

import Image from "next/image";
import { FcGoogle } from "react-icons/fc";

import { Button } from "@/components/ui/button";
import SmoothButton from "@/components/smoothui/smooth-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function LoginDialog({
  action,
  className,
}: {
  action: () => Promise<void>;
  className?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <SmoothButton
          variant="candy"
          color="green"
          className={`order-2 h-full px-3 md:order-none md:px-4 ${className ?? ""}`}
        >
          Try now
        </SmoothButton>
      </DialogTrigger>
      <DialogContent className="gap-6 p-6 sm:p-7">
        <Image src="/icon.svg" alt="" width={40} height={40} className="size-10" />
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold tracking-tight">
            Welcome to Carely
          </DialogTitle>
          <DialogDescription className="leading-6">
            Sign in to set up care information and keep everything in one place.
          </DialogDescription>
        </DialogHeader>
        <form action={action}>
          <Button type="submit" variant="outline" size="lg" className="w-full gap-3">
            <FcGoogle className="size-5" aria-hidden="true" />
            Continue with Google
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
