import { describe, expect, it } from "vitest";
import { titleCase } from "@/lib/notes";
describe("titleCase", () => {
  it("capitalises every word", () => {
    expect(titleCase("A note on low-count time series anomaly detection")).toBe(
      "A Note On Low-Count Time Series Anomaly Detection",
    );
  });

  it("leaves a word alone when it already carries a capital", () => {
    // Otherwise SAM2 becomes Sam2 and mIoU becomes MIoU, which is worse than
    // the inconsistency the casing exists to fix.
    expect(titleCase("distilling SAM2 and reporting mIoU on arXiv")).toBe(
      "Distilling SAM2 And Reporting mIoU On arXiv",
    );
  });

  it("capitalises both halves of a hyphenated word", () => {
    expect(titleCase("class-conditional noise")).toBe("Class-Conditional Noise");
  });
});
