import { describe, expect, it } from "vitest";
import { buildDownloadUrl } from "@/components/studio/SubmissionCard";

describe("buildDownloadUrl", () => {
  const signed =
    "https://x.supabase.co/storage/v1/object/sign/collection-files/a/b.png?token=abc.def.ghi";

  it("keeps the signature token untouched", () => {
    const u = new URL(buildDownloadUrl(signed, "Capture 1.png"));
    expect(u.searchParams.get("token")).toBe("abc.def.ghi");
  });

  it("adds the original file name as download parameter", () => {
    const u = new URL(buildDownloadUrl(signed, "Vue d’ensemble (1).png"));
    expect(u.searchParams.get("download")).toBe("Vue d’ensemble (1).png");
  });
});
