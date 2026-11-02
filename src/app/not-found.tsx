import { Compass } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StateCard, ViewerFrame } from "@/components/viewer/viewer-frame";

export default function NotFound() {
  return (
    <ViewerFrame>
      <StateCard
        icon={<Compass className="size-7" strokeWidth={1.5} />}
        title={<>Lost in the <em>aether</em></>}
        action={
          <Button asChild>
            <Link href="/">Back to Aether</Link>
          </Button>
        }
      >
        The page you&apos;re looking for doesn&apos;t exist.
      </StateCard>
    </ViewerFrame>
  );
}
