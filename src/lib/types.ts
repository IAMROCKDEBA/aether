// Client-safe shapes shared by API routes and UI. Mirrors the Prisma enums
// without pulling the generated client into the browser bundle.

export const VISIBILITIES = ["PRIVATE", "RESTRICTED", "PUBLIC"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export type FileDTO = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  visibility: Visibility;
  createdAt: string;
};

export type OwnedFileDTO = FileDTO & {
  shareCount: number;
  activeLinkCount: number;
};

export type SharedFileDTO = FileDTO & {
  owner: { name: string; email: string };
  sharedAt: string;
};

export type LinkState = "active" | "expired" | "revoked" | "exhausted";

export type LinkDTO = {
  id: string;
  url: string;
  label: string | null;
  expiresAt: string;
  createdAt: string;
  hasPassword: boolean;
  maxDownloads: number | null;
  downloadCount: number;
  state: LinkState;
};

export type ShareDTO = {
  userId: string;
  name: string;
  email: string;
  createdAt: string;
};

export type AccessEventDTO = {
  id: string;
  action: "VIEW" | "DOWNLOAD";
  channel: "SHARED_USER" | "PUBLIC_URL" | "TEMP_LINK";
  actorName: string | null;
  linkLabel: string | null;
  at: string;
};

export type FileDetailDTO = {
  file: OwnedFileDTO;
  shares: ShareDTO[];
  links: LinkDTO[];
  events: AccessEventDTO[];
};

export type UsageDTO = { used: number; quota: number; count: number };

export type FilePage = {
  files: OwnedFileDTO[];
  nextCursor: string | null;
  usage: UsageDTO;
};

export type ApiError = { error: { code: string; message: string } };
