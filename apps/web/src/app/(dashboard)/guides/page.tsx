import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { GuidesManager } from "@/components/guides-manager";
import { listGuides } from "@/lib/guides-db";

export default async function GuidesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string | string[] }>;
}) {
  const session = await auth();
  const ownerEmail = session?.user?.email?.trim().toLowerCase();
  if (!ownerEmail) redirect("/");

  const edit = (await searchParams).edit;

  return (
    <GuidesManager
      initialGuides={listGuides(ownerEmail)}
      editGuideId={typeof edit === "string" ? edit : undefined}
    />
  );
}
