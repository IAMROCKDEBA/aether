"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-[70dvh] place-items-center px-4">
      <div className="edge-light relative w-full max-w-md rounded-[32px] border border-line bg-raised p-10 text-center shadow-lg">
        <span className="mx-auto grid size-16 place-items-center rounded-[22px] bg-danger-soft text-danger">
          <TriangleAlert className="size-7" strokeWidth={1.5} />
        </span>
        <h1 className="mt-6 font-display text-[36px] leading-tight text-ink">
          Something <em>slipped</em>
        </h1>
        <p className="mt-2 text-[15px] text-ink-soft">
          An unexpected error occurred. Your files are safe.
          {error.digest && <span className="mt-1 block font-mono text-xs text-ink-muted">Ref {error.digest}</span>}
        </p>
        <Button onClick={reset} className="mt-8">
          <RotateCcw className="size-4" /> Try again
        </Button>
      </div>
    </div>
  );
}
