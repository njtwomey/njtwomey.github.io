import * as React from "react";

/**
 * Which of a set of section ids is currently the one being read.
 *
 * The rule is "the topmost section intersecting a band near the top of the
 * viewport" rather than "whichever is closest to the middle", because a section
 * shorter than the viewport would otherwise never win and its entry in a
 * contents list would never light up.
 *
 * The band is set by `rootMargin`: everything below 30% of the viewport height
 * is cut away, so a section only counts once its heading has climbed into the
 * upper third. The 80px at the top clears the sticky header.
 */
export function useScrollSpy(ids: string[]): string {
  const [active, setActive] = React.useState(ids[0] ?? "");

  // The array is rebuilt on every render by most callers, so depend on its
  // contents rather than its identity to avoid resubscribing constantly.
  const key = ids.join("|");

  React.useEffect(() => {
    const sections = key.split("|").filter(Boolean);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 },
    );

    for (const id of sections) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [key]);

  return active;
}
