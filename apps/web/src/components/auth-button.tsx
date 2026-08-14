import Link from "next/link";

import { auth, signIn } from "@/auth";
import { LoginDialog } from "@/components/login-dialog";
import SmoothButton from "@/components/smoothui/smooth-button";

async function signInWithGoogle() {
  "use server";
  await signIn("google", { redirectTo: "/home" });
}

export async function AuthButton({ className }: { className?: string }) {
  const session = await auth();

  if (!session) return <LoginDialog action={signInWithGoogle} className={className} />;

  return (
    <SmoothButton
      asChild
      variant="candy"
      color="green"
      className={`order-2 h-full px-3 md:order-none md:px-4 ${className ?? ""}`}
    >
      <Link href="/home">Home</Link>
    </SmoothButton>
  );
}
