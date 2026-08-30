import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { GuideDetail } from "@/components/guide-detail";
import { getGuide } from "@/lib/guides-db";

export default async function GuidePage({
  params,
}: {
  params: Promise<{ guideId: string }>;
}) {
  const session = await auth();
  const ownerEmail = session?.user?.email?.trim().toLowerCase();
  if (!ownerEmail) redirect("/");

  const { guideId } = await params;
  const guide = getGuide(ownerEmail, guideId);
  if (!guide) notFound();

  return <GuideDetail guide={guide} />;
}
