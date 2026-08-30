import { describe, expect, test } from "bun:test";

import {
  formatGuideFileSize,
  getGuideFileFormat,
  getGuideFileKind,
  parseGuideFiles,
  parseGuideInput,
} from "@/lib/guides";

describe("guide validation", () => {
  test("trims valid guide text", () => {
    const formData = new FormData();
    formData.set("title", "  How to use the AC  ");
    formData.set("note", "  Simple cooling steps.  ");
    formData.set("context", "  Press Cool, then choose 24 degrees.  ");

    expect(parseGuideInput(formData)).toEqual({
      title: "How to use the AC",
      note: "Simple cooling steps.",
      context: "Press Cool, then choose 24 degrees.",
    });
  });

  test("accepts documents but rejects GIF and unsafe HTML uploads", () => {
    const valid = new FormData();
    valid.append("attachments", new File(["guide"], "guide.pdf", { type: "application/pdf" }));
    valid.append("attachments", new File(["steps"], "steps.txt", { type: "text/plain" }));
    expect(parseGuideFiles(valid)).toHaveLength(2);

    const gif = new FormData();
    gif.append("attachments", new File(["gif"], "controls.gif", { type: "image/gif" }));
    expect(() => parseGuideFiles(gif)).toThrow("not a supported guide file");

    const unsafe = new FormData();
    unsafe.append("attachments", new File(["<script>"], "guide.html", { type: "text/html" }));
    expect(() => parseGuideFiles(unsafe)).toThrow("not a supported");
  });

  test("limits image analysis to five files", () => {
    const formData = new FormData();
    for (let index = 0; index < 6; index += 1) {
      formData.append("attachments", new File(["image"], `${index}.png`, { type: "image/png" }));
    }

    expect(() => parseGuideFiles(formData)).toThrow("no more than five");
  });

  test("allows only one video walkthrough", () => {
    const formData = new FormData();
    formData.append("attachments", new File(["video"], "first.mp4", { type: "video/mp4" }));
    formData.append("attachments", new File(["video"], "second.mp4", { type: "video/mp4" }));

    expect(() => parseGuideFiles(formData)).toThrow("only one guide video");
  });

  test("describes uploaded files for the guide table", () => {
    expect(getGuideFileKind("audio/mpeg")).toBe("Audio");
    expect(getGuideFileFormat("medicine-steps.mp3", "audio/mpeg")).toBe("MP3");
    expect(getGuideFileFormat("oven.md", "text/markdown")).toBe("Markdown");
    expect(formatGuideFileSize(1_572_864)).toBe("1.5 MB");
  });
});
