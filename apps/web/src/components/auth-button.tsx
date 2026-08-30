import Link from "next/link";

import { auth, signIn } from "@/auth";
import { LoginDialog } from "@/components/login-dialog";
import SmoothButton from "@/components/smoothui/smooth-button";

async function signInWithGoogle(redirectTo: "/home" | "/try") {
  "use server";
  await signIn("google", { redirectTo });
}

export async function AuthButton({
  authenticatedHref = "/home",
  className,
  label,
  signedOutRedirectTo = "/home",
}: {
  authenticatedHref?: "/home" | "/try";
  className?: string;
  label?: string;
  signedOutRedirectTo?: "/home" | "/try";
}) {
  const session = await auth();
  const action = signInWithGoogle.bind(null, signedOutRedirectTo);

  if (!session) return <LoginDialog action={action} className={className} label={label} />;

  return (
    <SmoothButton
      asChild
      variant="candy"
      color="green"
      className={`order-2 h-full px-3 md:order-none md:px-4 ${className ?? ""}`}
    >
      <Link href={authenticatedHref}>{label ?? "Home"}</Link>
    </SmoothButton>
  );
}
