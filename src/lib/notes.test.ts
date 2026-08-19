import { describe, expect, it } from "vitest";
import { titleCase } from "@/lib/notes";

describe("titleCase", () => {
  it("capitalises the words that carry meaning", () => {
    expect(titleCase("A note on low-count time series anomaly detection")).toBe(
      "A Note on Low-Count Time Series Anomaly Detection",
    );
  });

  it("leaves minor words alone in the middle of a title", () => {
    // The bug this replaces capitalised every word, giving "What A Better
    // Retriever Does To Re-Ranking", which is the tell of a naive transform.
    expect(titleCase("what a better retriever does to re-ranking")).toBe("What a Better Retriever Does to Re-Ranking");
  });

  it("capitalises a minor word when it opens or closes the title", () => {
    expect(titleCase("the model is trained on")).toBe("The Model Is Trained On");
  });

  it("capitalises the first word after a colon", () => {
    expect(titleCase("second opinions: a note on retrieval")).toBe("Second Opinions: A Note on Retrieval");
  });

  it("leaves a word the source capitalised deliberately", () => {
    expect(titleCase("distilling SAM2 and reporting mIoU on arXiv")).toBe(
      "Distilling SAM2 and Reporting mIoU on arXiv",
    );
  });

  it("leaves a comparative lowercase, with or without the full stop", () => {
    expect(titleCase("fast vs. contextual retrieval in search re-ranking")).toBe(
      "Fast vs. Contextual Retrieval in Search Re-Ranking",
    );
    expect(titleCase("speed versus accuracy")).toBe("Speed versus Accuracy");
  });

  it("capitalises both halves of a hyphenated word", () => {
    expect(titleCase("class-conditional noise")).toBe("Class-Conditional Noise");
  });
});
