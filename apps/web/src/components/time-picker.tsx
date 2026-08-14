// Simple twelve-hour time picker that avoids free-form time entry.
"use client";

import { useEffect, useState } from "react";

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
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const parsed = parseTime(value);
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const [period, setPeriod] = useState(parsed.period);

  useEffect(() => {
    onChange(`${hour}:${minute} ${period}`);
  }, [hour, minute, period, onChange]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Hour"
        value={hour}
        onChange={(event) => setHour(event.target.value)}
        className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {hours.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <span aria-hidden="true" className="text-muted-foreground">
        :
      </span>
      <select
        aria-label="Minute"
        value={minute}
        onChange={(event) => setMinute(event.target.value)}
        className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {minutes.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <div className="flex h-10 rounded-lg border border-input p-1" role="group" aria-label="AM or PM">
        {(["AM", "PM"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={period === option}
            className={cn(
              "rounded-md px-3 text-sm transition-colors",
              period === option ? "bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
            onClick={() => setPeriod(option)}
          >
            {option}
          </button>
        ))}
      </div>
      <input id={id} type="hidden" name={id} value={value} required readOnly />
    </div>
  );
}
