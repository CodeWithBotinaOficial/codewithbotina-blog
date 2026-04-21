import { describe, it, expect } from "vitest";
import { pickLinkedPostImageUrl } from "../../../src/lib/admin-linked-image";

describe("pickLinkedPostImageUrl", () => {
  it("returns the first non-empty trimmed image url", () => {
    const url = pickLinkedPostImageUrl([
      { imagen_url: " " },
      { imagen_url: null },
      { imagen_url: "https://example.com/a.webp " },
      { imagen_url: "https://example.com/b.webp" },
    ]);
    expect(url).toBe("https://example.com/a.webp");
  });

  it("returns empty string when none are present", () => {
    expect(pickLinkedPostImageUrl([{ imagen_url: "" }, { imagen_url: "   " }])).toBe("");
  });
});

