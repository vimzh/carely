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
    id: "oven",
    title: "Oven dial: set gas mark 4 safely",
    note: "Exact help for the numbered oven dial shown in the close-up photo.",
    context:
      "Use only the cream oven dial shown in the guide photo. It has OFF at the top, LOW at the upper left, and the numbers 1 through 9 around the lower edge and right side. Explain one physical action per reply and wait for confirmation before continuing. Before turning the oven on, confirm there is nothing stored inside, the door closes normally, and there is no smell of gas. The black indicator line on the white knob shows the selected setting. For ordinary baking at about 180°C, rotate the knob slowly until that black indicator line points exactly to 4. If the caller cannot see the indicator line or the numbers do not match the photo, stop and ask family rather than guessing. Keep hands, cloths, paper, and plastic away from the oven vents and door. Let the oven preheat for 10 minutes, then use dry oven gloves to place the dish on the middle rack and close the door. Set a separate timer for the recipe time; this dial does not turn itself off. When finished, rotate the knob back until the indicator line points exactly to OFF at the top, then visually confirm it is off. If gas is smelled, do not operate a switch, flame, or plug; move outside and call family or the gas emergency service. If there is smoke or fire, keep the door closed, turn the dial to OFF only if safe, move away, and call emergency services.",
    attachments: [],
  },
  {
    id: "tv-remote",
    title: "Vizio TV remote: channels, volume, and No Signal",
    note: "Button-by-button help using the exact Vizio remote shown in the close-up photo.",
    context:
      "Use only the black Vizio remote shown in the guide photo. Orient it with INPUT at the top left and the red power button at the top right. Explain one physical action per reply and wait for confirmation before continuing. To turn the TV on, press the red power button once. For volume, use the left vertical VOL rocker: the upper arrow makes it louder and the lower arrow makes it quieter. For channels, use the right vertical CH rocker: the upper arrow moves up and the lower arrow moves down. To enter a channel directly, press its number buttons and then ENTER at the bottom left. If the screen says No Signal, press INPUT at the top left once, ask the caller to read the source names shown on the TV, use the arrow pad around OK to highlight the family's TV or HDMI source, and press OK. Do not use the small red record button during basic viewing. If the remote does not respond, check that nothing blocks the TV sensor, then replace both batteries with the same type and match the plus and minus marks. If the TV or remote smells burnt, sparks, or becomes unusually hot, stop using it, move away, and call family.",
    attachments: [],
  },
  {
    id: "microwave-panel",
    title: "Microwave keypad: reheat for 60 seconds",
    note: "Safe reheating using the exact number pad shown in the front-view photo.",
    context:
      "Use only the white microwave keypad shown straight-on in the guide photo. Explain one physical action per reply and wait for confirmation before continuing. First confirm the food is in microwave-safe glass or plain ceramic; never allow metal, foil, sealed jars, or ordinary plastic. Cover the bowl loosely so steam can escape, place it in the center, and close the door firmly. For a basic 60-second reheat, press the number 1 once. It is the upper-left key in the number pad, below TIME COOK. On this model, 1 is marked EXPRESS COOK and starts one minute automatically. Do not press START after using 1 unless the display is waiting instead of counting down. When heating stops, wait 10 seconds, open the door carefully, and stir from the center outward. If the food is still cold, close the door and press 1 once more. To stop early, press the round CLEAR/OFF button to the right of the number pad, directly below the round START button. If there is sparking, smoke, a burning smell, or a damaged cable, press CLEAR/OFF if it is safe, keep the door closed, move away, and call family. Never guess a control if the panel does not match the photo.",
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
