// Shared authenticated dashboard shell with route-aware sidebar navigation.
"use client";

import Link from "next/link";
import { BookOpenText, ContactRound, Home } from "lucide-react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { CarelyMark } from "@/components/carely-mark";
import { ProfileDialog } from "@/components/profile-dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const navItems = [
  { label: "Home", href: "/home", icon: Home },
  { label: "Contacts", href: "/contacts", icon: ContactRound },
  { label: "Guides", href: "/guides", icon: BookOpenText },
];

export function DashboardShell({
  children,
  name,
  email,
  initial,
  mackinacClassName,
  action,
}: {
  children: ReactNode;
  name: string;
  email: string | null | undefined;
  initial: string;
  mackinacClassName: string;
  action: () => Promise<void>;
}) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar collapsible="offcanvas">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild size="lg">
                <Link href="/">
                  <CarelyMark className="size-9" />
                  <span className={`${mackinacClassName} text-lg font-normal tracking-tight`}>
                    Carely
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {navItems.map(({ label, href, icon: Icon }) => {
                  const isActive = pathname === href;
                  return (
                    <SidebarMenuItem key={label}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
                        <Link href={href} aria-current={isActive ? "page" : undefined}>
                          <Icon aria-hidden="true" />
                          <span>{label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <ProfileDialog name={name} email={email} initial={initial} action={action} />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 items-center border-b px-4 md:hidden">
          <SidebarTrigger />
          <span className="ml-2 text-sm font-medium">
            {navItems.find(({ href }) => href === pathname)?.label ?? "Dashboard"}
          </span>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
