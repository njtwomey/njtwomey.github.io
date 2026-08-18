import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Paper } from "@/components/paper";
import { TooltipProvider } from "@/components/ui/tooltip";
import { publications } from "@/lib/publications";

/** A real entry, so the test breaks if the generated shape changes. */
const sample = publications.find((p) => p.pdf && p.authors.length > 2)!;

function renderPaper(ui: React.ReactNode) {
  return render(
    <MemoryRouter>
      <TooltipProvider>{ui}</TooltipProvider>
    </MemoryRouter>,
  );
}

describe("<Paper>", () => {
  it("renders the title, the venue and every author", () => {
    renderPaper(<Paper id={sample.key} />);

    expect(screen.getByText(sample.title)).toBeTruthy();
    for (const author of sample.authors) {
      expect(screen.getByText(new RegExp(author.last.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))).toBeTruthy();
    }
  });

  it("anchors the entry on its citation key, so /publications#key works", () => {
    const { container } = renderPaper(<Paper id={sample.key} />);
    expect(container.querySelector(`[id="${sample.key}"]`)).not.toBeNull();
  });

  it("links to the PDF", () => {
    renderPaper(<Paper id={sample.key} />);
    const link = screen.getByRole("link", { name: /PDF/ });
    expect(link.getAttribute("href")).toContain(sample.pdf!.replace(/^\//, ""));
  });

  it("offers no Abstract button until the details have been fetched", () => {
    // `loadDetails()` is not called in this test, which is the same state as a
    // failed fetch: the page still renders, minus those two controls.
    renderPaper(<Paper id={sample.key} />);
    expect(screen.queryByRole("button", { name: /Abstract/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /BibTeX/ })).toBeNull();
  });

  it("renders nothing for an unknown citation key", () => {
    const { container } = renderPaper(<Paper id="nosuchkey2099" />);
    // In dev the component shows a visible marker instead of failing silently.
    expect(container.textContent).toMatch(/^(|.*unknown citation key: nosuchkey2099.*)$/);
  });

  it("drops the abstract and BibTeX controls in the compact variant", () => {
    renderPaper(<Paper id={sample.key} variant="compact" />);
    expect(screen.getByText(sample.title)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /BibTeX/ })).toBeNull();
  });
});
