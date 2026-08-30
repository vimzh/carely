// Simple twelve-hour time picker that avoids free-form time entry.
"use client";

import { cn } from "@/lib/utils";

const hours = Array.from({ length: 12 }, (_, index) => String(index + 1));
const minutes = ["00", "15", "30", "45"];

function parseTime(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return { hour: "9", minute: "00", period: "AM" };
  return { hour: String(Number(match[1])), minute: match[2], period: match[3].toUpperCase() };
}

export function TimePicker({
  id,
  value,
  onChange,
  invalid = false,
  ariaDescribedBy,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  ariaDescribedBy?: string;
}) {
  const { hour, minute, period } = parseTime(value);

  return (
    <div className="flex w-fit items-center rounded-lg border border-input bg-background p-1">
      <select
        aria-label="Hour"
        aria-invalid={invalid || undefined}
        aria-describedby={ariaDescribedBy}
        value={hour}
        onChange={(event) => onChange(`${event.target.value}:${minute} ${period}`)}
        className="h-8 w-14 rounded-md border-0 bg-transparent px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {hours.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <span aria-hidden="true" className="px-0.5 text-muted-foreground">
        :
      </span>
      <select
        aria-label="Minute"
        aria-invalid={invalid || undefined}
        aria-describedby={ariaDescribedBy}
        value={minute}
        onChange={(event) => onChange(`${hour}:${event.target.value} ${period}`)}
        className="h-8 w-14 rounded-md border-0 bg-transparent px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {minutes.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <div className="ml-1 flex rounded-md bg-muted p-0.5" role="group" aria-label="AM or PM">
        {(["AM", "PM"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={period === option}
            className={cn(
              "h-7 rounded px-2.5 text-sm transition-colors",
              period === option ? "bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
            onClick={() => onChange(`${hour}:${minute} ${option}`)}
          >
            {option}
          </button>
        ))}
      </div>
      <input id={id} type="hidden" name={id} value={value} required readOnly />
    </div>
  );
}
