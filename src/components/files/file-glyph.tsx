import {
  FileArchive,
  FileAudio2,
  FileCode2,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo2,
  File as FileIcon,
  Presentation,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { fileExtension } from "@/lib/format";
import { fileFamily, type FileFamily } from "@/lib/mime";

const FAMILY: Record<FileFamily, { icon: LucideIcon; hue: string }> = {
  image: { icon: FileImage, hue: "from-[#e6c9a8]/95 to-[#c9b6e0]/75" },
  video: { icon: FileVideo2, hue: "from-[#d6b3c6]/95 to-[#a9b8d9]/75" },
  audio: { icon: FileAudio2, hue: "from-[#b9d2c4]/95 to-[#d8c9a3]/75" },
  pdf: { icon: ScrollText, hue: "from-[#e3b9a6]/95 to-[#e6d3b6]/75" },
  doc: { icon: FileText, hue: "from-[#b6c4e3]/95 to-[#d9d4c6]/75" },
  sheet: { icon: FileSpreadsheet, hue: "from-[#b4d6bf]/95 to-[#d7d9bd]/75" },
  slides: { icon: Presentation, hue: "from-[#e8c7a0]/95 to-[#e3b9b2]/75" },
  archive: { icon: FileArchive, hue: "from-[#cfc4b4]/95 to-[#b9b5c4]/75" },
  code: { icon: FileCode2, hue: "from-[#b9c0e0]/95 to-[#b7d6d0]/75" },
  text: { icon: FileText, hue: "from-[#dcd3c3]/95 to-[#cfd3dc]/75" },
  other: { icon: FileIcon, hue: "from-[#d9d2c6]/95 to-[#c9c6d0]/75" },
};

/** A tinted, glass-like file tile used where there is no image thumbnail. */
export function FileGlyph({
  name,
  mimeType,
  size = "md",
  className,
}: {
  name: string;
  mimeType: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { icon: Icon, hue } = FAMILY[fileFamily(mimeType, name)];
  const ext = fileExtension(name);
  return (
    <div
      className={cn(
        "relative grid place-items-center overflow-hidden bg-surface-sunken",
        size === "sm" && "size-10 rounded-xl",
        size === "md" && "size-full",
        size === "lg" && "size-28 rounded-3xl",
        className,
      )}
    >
      {/* Only the tint dims in dark mode; the icon stays crisp. */}
      <div className={cn("absolute inset-0 bg-gradient-to-br dark:opacity-[0.22]", hue)} />
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_20%_0%,rgb(255_255_255/0.55),transparent_60%)] dark:bg-[radial-gradient(120%_80%_at_20%_0%,rgb(255_255_255/0.07),transparent_60%)]" />
      <div className="relative flex flex-col items-center gap-1.5 text-ink/70 dark:text-ink/80">
        <Icon
          className={cn(size === "sm" ? "size-[18px]" : size === "lg" ? "size-10" : "size-9")}
          strokeWidth={1.25}
        />
        {ext && size !== "sm" && (
          <span className="font-mono text-[10px] font-medium tracking-[0.18em] text-ink/55">{ext}</span>
        )}
      </div>
    </div>
  );
}
