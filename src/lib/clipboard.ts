"use client";

import { toast } from "sonner";

export async function copyText(text: string, label = "Link copied") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  } catch {
    toast.error("Couldn't access the clipboard. Copy it manually.");
  }
}

/** The shareable address of a file (works when it is Public, or for invited people). */
export const fileUrl = (id: string) => `${location.origin}/f/${id}`;
