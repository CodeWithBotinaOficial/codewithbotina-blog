import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "preact";
import StorageImageGallery from "../../../src/components/admin/StorageImageGallery";

describe("StorageImageGallery", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.unstubAllGlobals();
  });

  it("loads images and lets admin apply one", async () => {
    const onUse = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          images: [
            {
              name: "img-1.webp",
              url: "https://example.com/img-1.webp",
              size: 1234,
              created_at: "2026-03-15T00:00:00Z",
            },
          ],
          has_more: false,
          next_offset: 48,
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <StorageImageGallery
        appliedImage={null}
        onUse={onUse}
        labels={{
          uploadNew: "Upload New",
          selectFromLibrary: "Select from Library",
          externalUrl: "External URL",
          useThisImage: "Use This Image",
          cancel: "Cancel",
          noImages: "No images",
          filenameReadOnly: "Filename read-only",
          searchImages: "Search images...",
          selectedImage: "Selected Image",
          pickHint: "Pick one",
          fileInfo: "File Information",
          filename: "Filename",
          fileSize: "File Size",
          dimensions: "Dimensions",
          uploadedOn: "Uploaded",
          loading: "Loading...",
          error: "Error",
          retry: "Retry",
          loadMore: "Load more",
          locale: "en-US",
        }}
      />,
      container,
    );

    // Allow effect + fetch to run and state to flush.
    for (let i = 0; i < 5 && fetchMock.mock.calls.length === 0; i++) {
      await new Promise((r) => setTimeout(r, 0));
      await Promise.resolve();
    }
    expect(fetchMock).toHaveBeenCalled();

    let thumb: HTMLButtonElement | undefined;
    for (let i = 0; i < 10 && !thumb; i++) {
      await new Promise((r) => setTimeout(r, 0));
      await Promise.resolve();
      thumb = Array.from(container.querySelectorAll("button")).find((b) =>
        b.textContent?.includes("img-1.webp")
      ) as HTMLButtonElement | undefined;
    }
    expect(thumb).toBeTruthy();
    thumb?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    await new Promise((r) => setTimeout(r, 0));
    await Promise.resolve();

    const useBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Use This Image")
    );
    expect(useBtn).toBeTruthy();
    useBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onUse).toHaveBeenCalledTimes(1);
    expect(onUse.mock.calls[0][0].name).toBe("img-1.webp");
  });
});
