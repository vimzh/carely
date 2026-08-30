// Shared authenticated dashboard shell with route-aware sidebar navigation.
"use client";

import Link from "next/link";
import { BellRing, BookOpenText, ContactRound, Home, MessageSquareText, Play, WifiOff } from "lucide-react";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, type ReactNode } from "react";

import { ProfileDialog } from "@/components/profile-dialog";
import AIOrbFace from "@/components/smoothui/ai-orb-face";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Home", href: "/home", icon: Home },
  { label: "Contacts", href: "/contacts", icon: ContactRound },
  { label: "Reminders", href: "/reminders", icon: BellRing },
  { label: "Guides", href: "/guides", icon: BookOpenText },
  { label: "Logs", href: "/logs", icon: MessageSquareText },
  { label: "Test Carely", href: "/try", icon: Play },
];

function subscribeToConnection(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function DesktopSidebarReopenButton() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const label = isCollapsed ? "Open sidebar" : "Close sidebar";

  return (
    <SidebarTrigger
      className={
        isCollapsed
          ? "fixed left-3 top-3 z-30 hidden md:flex"
          : "fixed left-[calc(var(--sidebar-width)+0.75rem)] top-3 z-30 hidden md:flex"
      }
      aria-label={label}
      title={label}
    />
  );
}

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
  const isPlayground = pathname === "/try";
  const isOnline = useSyncExternalStore(subscribeToConnection, () => navigator.onLine, () => true);

  return (
    <SidebarProvider>
      <Sidebar collapsible="offcanvas">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/" className="flex h-12 items-center gap-2 px-2 text-left">
                <AIOrbFace
                  size={36}
                  state="done"
                  colors={{
                    body: "oklch(84% 0.09 151)",
                    bodyEdge: "oklch(68% 0.14 151)",
                    feature: "oklch(25% 0.04 151)",
                  }}
                />
                <span className={`${mackinacClassName} text-lg font-normal tracking-tight`}>
                  Carely
                </span>
              </Link>
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
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={label}
                        className={href === "/try" ? "mt-3 bg-green/10 hover:bg-green/15 data-[active=true]:bg-green/20 [&_svg]:text-green-hover" : undefined}
                      >
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
        <DesktopSidebarReopenButton />
        {!isOnline && (
          <div
            className="flex min-h-11 items-center justify-center gap-2 border-b border-amber/40 bg-amber/15 px-4 py-2 text-center text-sm"
            role="status"
            aria-live="polite"
          >
            <WifiOff className="size-4 shrink-0" aria-hidden="true" />
            <span>You’re offline. Carely will not send or save changes until you reconnect.</span>
          </div>
        )}
        <header className="flex h-14 items-center border-b px-4 md:hidden">
          <SidebarTrigger />
          <span className="ml-2 text-sm font-medium">
            {navItems.find(({ href }) => href === pathname)?.label ?? "Dashboard"}
          </span>
        </header>
        <div
          className={cn(
            "flex min-h-[calc(100svh-3.5rem)] md:min-h-svh",
            !isPlayground && "px-6 py-8 sm:px-10 sm:py-10",
          )}
        >
          <div
            className={cn(
              "flex w-full flex-1 flex-col",
              !isPlayground && "mx-auto max-w-5xl gap-8",
            )}
          >
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
