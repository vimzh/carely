import Link from "next/link";

import { auth, signIn } from "@/auth";
import { LoginDialog } from "@/components/login-dialog";

async function signInWithGoogle() {
  "use server";
  await signIn("google", { redirectTo: "/home" });
}

export async function AuthButton({ className }: { className?: string }) {
  const session = await auth();

  if (!session) return <LoginDialog action={signInWithGoogle} className={className} />;

  return (
    <Link
      href="/home"
      className={`order-2 inline-flex h-full items-center rounded-[calc(0.75rem-0.2rem)] bg-primary px-3 font-medium text-primary-foreground transition-colors duration-300 hover:bg-primary/90 md:order-none md:px-4 ${className ?? ""}`}
    >
      Home
    </Link>
  );
}
