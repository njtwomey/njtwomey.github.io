import type { LucideIcon } from "lucide-react";
import * as React from "react";
import { Link } from "react-router-dom";
import { MARGIN_HIDDEN, type MarginWidth } from "@/components/page";
import { cn } from "@/lib/utils";

export type ContentsItem = {
  /** The `id` on the section this jumps to. */
  id: string;
  label: string;
  /** Optional, and worth having when the same icon marks the section itself. */
  icon?: LucideIcon;
  /** Trailing detail, such as how many entries a year holds. */
  meta?: React.ReactNode;
  /**
   * A route to navigate to, for a rail that moves between pages rather than
   * between sections of one. Without it the item is an in-page anchor, which is
   * what a list of years or of headings wants.
   */
  to?: string;
  /**
   * A subheading to file this item under. Consecutive items sharing one are
   * listed together beneath it, so the caller controls grouping purely by the
   * order it passes items in. Leave it off for a flat list.
   */
  group?: string;
};

/**
 * Consecutive items sharing a `group`, in the order given.
 *
 * Runs rather than buckets: an item's position is the caller's decision, and
 * collecting scattered items under one heading would silently reorder a list
 * whose order was deliberate. It also lets an ungrouped item — the index link
 * at the top — sit above the first heading without a special case.
 */
function runs(items: ContentsItem[]): { group?: string; items: ContentsItem[] }[] {
  const out: { group?: string; items: ContentsItem[] }[] = [];
  for (const item of items) {
    const last = out.at(-1);
    if (last && last.group === item.group) last.items.push(item);
    else out.push({ group: item.group, items: [item] });
  }
  return out;
}

/**
 * One row, as a router link where the item names a route and as a plain anchor
 * otherwise. Keeping both behind one component means a rail can mix the two, and
 * means neither caller has to know which kind of list it is rendering.
 */
function RailLink({
  item,
  current,
  className,
  children,
}: {
  item: ContentsItem;
  current?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const shared = { className, "aria-current": current ? ("true" as const) : undefined };
  return item.to ? (
    <Link to={item.to} {...shared}>
      {children}
    </Link>
  ) : (
    <a href={`#${item.id}`} {...shared}>
      {children}
    </a>
  );
}

/**
 * The contents list every page with a rail uses.
 *
 * Placement, width and stickiness are `Page`'s job through its `left` and
 * `right` slots; this is only what goes inside one. Keeping the two apart means
 * the same list works in either margin, and means a page cannot invent its own
 * idea of what an active item looks like.
 *
 * The active id is passed in rather than computed here, because a page usually
 * wants it for something else as well. The work page highlights the matching
 * row of its index with it, so one `useScrollSpy` call drives both and the two
 * navigations cannot disagree.
 */
/**
 * Bring the active row into the rail's own scroll box.
 *
 * A rail listing every note is taller than the box `Page` gives it, so opening
 * the oldest note would otherwise show a rail scrolled to the top with the
 * current note somewhere out of sight below. The scroll position is part of
 * saying which row is selected.
 *
 * It walks up to the ancestor that actually scrolls and sets `scrollTop` there
 * rather than calling `scrollIntoView`, which is free to scroll the window as
 * well and would fight the route change that has just reset it. Rows already in
 * view are left alone, so a rail driven by a scroll spy does not lurch on every
 * section boundary.
 */
function useScrollActiveIntoView(active: string) {
  const ref = React.useRef<HTMLLIElement | null>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let box = el.parentElement;
    while (box && box.scrollHeight <= box.clientHeight) box = box.parentElement;
    if (!box) return;

    const row = el.getBoundingClientRect();
    const view = box.getBoundingClientRect();
    if (row.top >= view.top && row.bottom <= view.bottom) return;
    box.scrollTop += row.top - view.top - (view.height - row.height) / 2;
  }, [active]);

  return ref;
}

export function ContentsRail({
  items,
  active,
  heading,
  label = "Contents",
}: {
  items: ContentsItem[];
  active: string;
  /** A small uppercase caption above the list. Omitted for a bare list of years. */
  heading?: string;
  /** The accessible name of the nav landmark. */
  label?: string;
}) {
  const activeRow = useScrollActiveIntoView(active);

  // A contents list of one is a heading repeated.
  if (items.length < 2) return null;

  return (
    <nav aria-label={label}>
      {heading && (
        <p className="text-muted-foreground mb-3 text-[0.7rem] font-semibold tracking-widest uppercase">{heading}</p>
      )}
      {/* Group labels carry the emphasis and the caption above them recedes,
          which is the right way round: the caption names the whole nav once,
          while the groups are the structure a reader is actually navigating.
          Same treatment as the theme headings in the index table. */}
      <div className="space-y-5">
        {runs(items).map((run, index) => (
          <div key={run.group ?? `run-${index}`}>
            {run.group && (
              <p className="text-foreground mb-1.5 pl-3 text-xs font-semibold tracking-wide uppercase">{run.group}</p>
            )}
            <ul className="space-y-0.5 border-l">
              {run.items.map((item) => {
                const current = active === item.id;
                return (
                  <li key={item.id} ref={current ? activeRow : undefined}>
                    <RailLink
                      item={item}
                      current={current}
                      className={cn(
                        "-ml-px flex items-start gap-2 rounded-r-md border-l-2 py-1 pr-2 pl-3 text-sm leading-snug transition-colors",
                        current
                          ? "border-primary text-foreground font-medium"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground border-transparent",
                      )}
                    >
                      {item.icon && (
                        <item.icon
                          aria-hidden
                          className={cn(
                            "mt-0.5 size-3.5 shrink-0",
                            current ? "text-primary" : "text-muted-foreground/70",
                          )}
                        />
                      )}
                      <span className="min-w-0 flex-1 tabular-nums">{item.label}</span>
                      {item.meta != null && (
                        <span className="text-muted-foreground/70 mt-0.5 text-xs tabular-nums">{item.meta}</span>
                      )}
                    </RailLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}

/**
 * The same list, in the content flow, for viewports with no margin to put a
 * rail in.
 *
 * `Page` drops its margin slots below a width that depends on how wide the rail
 * is, so this takes the same `marginWidth` and hides itself at exactly the point
 * the rail appears. Passing a different value to the two is the one way to end
 * up with both at once or neither.
 *
 * Whether a page needs this at all is a judgement. A list of years does not,
 * because the year headings are already visible in the content; a list of
 * thirteen capability titles does, because otherwise there is no overview.
 */
export function ContentsDisclosure({
  marginWidth = "narrow",
  className,
  children,
}: {
  marginWidth?: MarginWidth;
  className?: string;
  /** The disclosure itself, so a page can label and count it however it likes. */
  children: React.ReactNode;
}) {
  return <div className={cn("mb-8", MARGIN_HIDDEN[marginWidth], className)}>{children}</div>;
}

/**
 * The same list, laid out for the wide short box the disclosure opens into.
 *
 * Each group gets its own two-column grid rather than one grid with headings
 * spanning it, so a heading always sits directly above its own items. A single
 * grid would let the last item of one group share a row with the first of the
 * next, which is exactly the confusion grouping is meant to remove.
 */
export function ContentsGrid({ items }: { items: ContentsItem[] }) {
  return (
    <div className="mt-2 space-y-3">
      {runs(items).map((run, index) => (
        <div key={run.group ?? `run-${index}`}>
          {run.group && (
            <p className="text-foreground mb-1.5 px-2 text-xs font-semibold tracking-wide uppercase">{run.group}</p>
          )}
          <ul className="grid gap-0.5 sm:grid-cols-2">
            {run.items.map((item) => (
              <li key={item.id}>
                <RailLink
                  item={item}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
                >
                  {item.icon && <item.icon aria-hidden className="text-muted-foreground/70 size-3.5 shrink-0" />}
                  {item.label}
                </RailLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
