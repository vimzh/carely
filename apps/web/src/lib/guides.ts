export type GuideAttachment = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt?: string;
};

export type Guide = {
  id: string;
  title: string;
  note: string;
  context: string;
  attachments: GuideAttachment[];
  createdAt?: string;
  updatedAt?: string;
};

export type GuideInput = Pick<Guide, "title" | "note" | "context">;

export const initialGuides: Guide[] = [
  {
    id: "air-conditioner",
    title: "How to configure the AC",
    note: "A simple way to cool the room without changing the wrong setting.",
    context:
      "Tell them to press the power button, choose Cool, and set the temperature to 24 degrees. If the remote shows a fan icon, press Mode until the snowflake appears.",
    attachments: [],
  },
  {
    id: "oven",
    title: "How to use the oven",
    note: "Step-by-step help for warming food safely.",
    context:
      "Explain which knob turns the oven on, how to choose 180 degrees, and how to check that the red heating light has turned off before opening the door.",
    attachments: [],
  },
  {
    id: "tv-remote",
    title: "How to use the TV remote",
    note: "Help finding the right channel and returning to normal TV.",
    context:
      "Start with the large power button, use the channel up and down buttons, and press Input if the screen says No signal. Remind them which button changes the volume.",
    attachments: [],
  },
];

export const allowedGuideFileTypes = new Set([
  "application/msword",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/markdown",
  "text/plain",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

export const maxGuideFileSize = 25 * 1024 * 1024;
export const maxGuideFilesSize = 40 * 1024 * 1024;
const maxGuideImageSize = 10 * 1024 * 1024;
const maxGuideImagesSize = 20 * 1024 * 1024;
const maxGuideVideoSize = 20 * 1024 * 1024;
const maxGuideImages = 5;

export function normalizeGuideMimeType(mimeType: string) {
  return mimeType.split(";", 1)[0]!.trim().toLowerCase();
}

export function getGuideFileKind(mimeType: string) {
  const normalized = normalizeGuideMimeType(mimeType);
  if (normalized.startsWith("image/")) return "Image";
  if (normalized.startsWith("audio/")) return "Audio";
  if (normalized.startsWith("video/")) return "Video";
  return "Document";
}

const guideFileFormats: Record<string, string> = {
  doc: "DOC",
  docx: "DOCX",
  jpeg: "JPEG",
  jpg: "JPEG",
  md: "Markdown",
  mov: "MOV",
  mp3: "MP3",
  mp4: "MP4",
  ogg: "OGG",
  pdf: "PDF",
  png: "PNG",
  txt: "Plain text",
  wav: "WAV",
  webm: "WebM",
  webp: "WebP",
};

export function getGuideFileFormat(fileName: string, mimeType: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension && guideFileFormats[extension]) return guideFileFormats[extension];
  return normalizeGuideMimeType(mimeType).split("/").pop()?.toUpperCase() ?? "File";
}

export function formatGuideFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isStaticGuideImage(file: File) {
  return normalizeGuideMimeType(file.type).startsWith("image/");
}

function isMovingGuideMedia(file: File) {
  return normalizeGuideMimeType(file.type).startsWith("video/");
}

export function parseGuideInput(formData: FormData): GuideInput {
  const input = {
    title: String(formData.get("title") ?? "").trim(),
    note: String(formData.get("note") ?? "").trim(),
    context: String(formData.get("context") ?? "").trim(),
  };

  if (!input.title || input.title.length > 160) {
    throw new Error("Add a guide title of 160 characters or fewer.");
  }
  if (!input.note || input.note.length > 500) {
    throw new Error("Add a short note of 500 characters or fewer.");
  }
  if (input.context.length > 20_000) {
    throw new Error("Guide context must be 20,000 characters or fewer.");
  }

  return input;
}

export function parseGuideFiles(formData: FormData): File[] {
  const files = formData
    .getAll("attachments")
    .filter((value): value is File => value instanceof File && value.size > 0);

  for (const file of files) {
    if (!file.name || file.name.length > 255) {
      throw new Error("Attachment file names must be 255 characters or fewer.");
    }
    if (!allowedGuideFileTypes.has(normalizeGuideMimeType(file.type))) {
      throw new Error(`${file.name} is not a supported guide file.`);
    }
    if (file.size > maxGuideFileSize) {
      throw new Error(`${file.name} is larger than 25 MB.`);
    }
    if (isStaticGuideImage(file) && file.size > maxGuideImageSize) {
      throw new Error(`${file.name} is larger than the 10 MB image limit.`);
    }
    if (isMovingGuideMedia(file) && file.size > maxGuideVideoSize) {
      throw new Error(`${file.name} is larger than the 20 MB video limit.`);
    }
  }

  if (files.reduce((size, file) => size + file.size, 0) > maxGuideFilesSize) {
    throw new Error("Guide attachments must total 40 MB or less.");
  }
  if (files.filter(isStaticGuideImage).reduce((size, file) => size + file.size, 0) > maxGuideImagesSize) {
    throw new Error("Guide images must total 20 MB or less.");
  }
  if (files.filter(isStaticGuideImage).length > maxGuideImages) {
    throw new Error("Add no more than five guide images.");
  }
  if (files.filter(isMovingGuideMedia).length > 1) {
    throw new Error("Add only one guide video.");
  }

  return files;
}
