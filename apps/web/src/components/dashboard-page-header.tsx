// Consistent title, description, and primary-action row for dashboard pages.
import type { ReactNode } from "react";

export function DashboardPageHeader({
  title,
  titleId,
  description,
  action,
}: {
  title: string;
  titleId?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 id={titleId} className="text-balance text-3xl font-semibold tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-pretty text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
