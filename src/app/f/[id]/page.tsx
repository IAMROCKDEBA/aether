import { FileQuestion } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileViewer } from "@/components/viewer/file-viewer";
import { StateCard, ViewerFrame } from "@/components/viewer/viewer-frame";
import { previewKind } from "@/lib/mime";
import { getViewableFile } from "@/server/files";
import { getCurrentUser } from "@/server/session";

export const metadata: Metadata = { title: "Shared file", referrer: "no-referrer" };

export default async function FilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const viewable = /^[A-Za-z0-9_-]{1,64}$/.test(id) ? await getViewableFile(user?.id ?? null, id) : null;

  if (!viewable) {
    return (
      <ViewerFrame>
        <StateCard
          icon={<FileQuestion className="size-7" strokeWidth={1.5} />}
          title={<>Not <em>available</em></>}
          action={
            !user ? (
              <Button asChild>
                <Link href={`/sign-in?next=${encodeURIComponent(`/f/${id}`)}`}>Sign in to check access</Link>
              </Button>
            ) : (
              <Button asChild variant="secondary">
                <Link href="/files">Back to your vault</Link>
              </Button>
            )
          }
        >
          This file doesn&apos;t exist, or its owner hasn&apos;t given you access.
          {!user && " If it was shared with you, sign in first."}
        </StateCard>
      </ViewerFrame>
    );
  }

  const { file, ownerName, isOwner } = viewable;
  const base = `/api/files/${file.id}/content`;
  return (
    <ViewerFrame>
      <FileViewer
        file={file}
        ownerName={isOwner ? "you" : ownerName}
        previewSrc={previewKind(file.mimeType) ? `${base}?disposition=inline` : null}
        downloadHref={`${base}?disposition=attachment`}
      />
    </ViewerFrame>
  );
}
