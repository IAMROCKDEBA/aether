import { Download, Eye } from "lucide-react";
import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/format";
import type { AccessEventDTO } from "@/lib/types";

const CHANNEL: Record<AccessEventDTO["channel"], string> = {
  SHARED_USER: "as an invited person",
  PUBLIC_URL: "through the public URL",
  TEMP_LINK: "through a temporary link",
};

function describe(e: AccessEventDTO) {
  const who = e.actorName ?? (e.channel === "PUBLIC_URL" ? "A visitor" : "Someone");
  const verb = e.action === "DOWNLOAD" ? "downloaded" : "viewed";
  const via = e.channel === "TEMP_LINK" && e.linkLabel ? `through “${e.linkLabel}”` : CHANNEL[e.channel];
  return { who, rest: `${verb} it ${via}` };
}

export function ActivitySection({ events }: { events: AccessEventDTO[] }) {
  return (
    <section aria-labelledby="activity-heading">
      <h3 id="activity-heading" className="text-[15px] font-medium text-ink">
        Activity
      </h3>
      <p className="text-[13px] text-ink-muted">Every view and download by someone other than you.</p>
      {events.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-line-strong px-4 py-6 text-center text-[13.5px] text-ink-muted">
          No one else has opened this file yet.
        </p>
      ) : (
        <ol className="relative mt-4 space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[15px] before:w-px before:bg-line-strong">
          {events.map((e) => {
            const { who, rest } = describe(e);
            const Icon = e.action === "DOWNLOAD" ? Download : Eye;
            return (
              <li key={e.id} className="relative flex items-start gap-3">
                <span
                  className={cn(
                    "relative grid size-8 shrink-0 place-items-center rounded-full ring-4 ring-canvas",
                    e.action === "DOWNLOAD" ? "bg-gold-soft text-gold" : "bg-surface-sunken text-ink-soft",
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <p className="pt-1.5 text-[13.5px] leading-snug text-ink-soft">
                  <span className="font-medium text-ink">{who}</span> {rest}
                  <span className="block text-xs text-ink-muted">{timeAgo(e.at)}</span>
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
