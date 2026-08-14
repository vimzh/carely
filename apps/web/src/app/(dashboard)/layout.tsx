import localFont from "next/font/local";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { auth, signOut } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";

const mackinac = localFont({
  src: "../fonts/p22-mackinac-book.woff2",
  weight: "400",
  style: "normal",
  display: "swap",
});

async function signOutUser() {
  "use server";
  if (!(await auth())) return;
  await signOut({ redirectTo: "/" });
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/");

  const name = session.user.name ?? "Carely user";
  const initial = (session.user.name ?? session.user.email ?? "U").charAt(0).toUpperCase();

  return (
    <DashboardShell
      name={name}
      email={session.user.email}
      initial={initial}
      mackinacClassName={mackinac.className}
      action={signOutUser}
    >
      {children}
    </DashboardShell>
  );
}
