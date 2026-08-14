import { cn } from "@/lib/utils";

export function CarelyMark({
  className,
  animated = false,
  framed = true,
}: {
  className?: string;
  animated?: boolean;
  framed?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 160 160"
      className={cn("text-primary", className)}
      aria-hidden="true"
    >
      {framed && (
        <rect
          x="4"
          y="4"
          width="152"
          height="152"
          rx="36"
          fill="var(--primary-foreground)"
        />
      )}
      <g fill="currentColor">
        <circle cx="82" cy="82" r="38" />
        <circle cx="54" cy="68" r="31" />
        <circle cx="79" cy="46" r="34" />
        <circle cx="109" cy="57" r="31" />
        <circle cx="120" cy="86" r="28" />
        <circle cx="104" cy="109" r="30" />
        <circle cx="72" cy="111" r="31" />
        <circle cx="44" cy="92" r="28" />
      </g>
      <g fill="var(--primary-foreground)">
        <rect
          className={animated ? "carely-logo-eye" : undefined}
          x="57"
          y="72"
          width="13"
          height="28"
          rx="6.5"
        />
        <rect
          className={animated ? "carely-logo-eye" : undefined}
          x="91"
          y="72"
          width="13"
          height="28"
          rx="6.5"
        />
      </g>
    </svg>
  );
}
