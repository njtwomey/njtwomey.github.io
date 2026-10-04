import { ChevronRight } from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { type TechnologyFamily, technologies } from "@/content/technologies";
import { cn } from "@/lib/utils";

/**
 * The tooling, as families that open.
 *
 * What this replaced was 2,600px of pills: 354 names in 23 groups, every one
 * at the same altitude, with 23 separate "+N more" controls and no summary. A
 * reader scanning for whether this person knows their stack had to read all of
 * it, and a list that long reads as padding whatever is in it.
 *
 * Same move as the practice page. A family is shut by default and shows the
 * tools inside it that are leaned on most, so the closed page answers "what
 * does he actually work in" in one screen. Opening a family gives the groups
 * and everything in them.
 *
 * Three things are deliberately gone.
 *
 * The per-group disclosures. Once a family opens, a second layer of hiding
 * inside it is a control that exists to manage a problem the first layer
 * already solved. A family opens to everything it holds.
 *
 * The contents rail and the expand-all. Both existed because the page was too
 * long to see the shape of; shut, it is one screen, and an index of what is
 * already on screen is furniture.
 *
 * Tooltips. A capability on the practice page needs saying what it is. A tool
 * is its own name: anybody who wants to know what Polars is already knows how
 * to find out, and anybody who does not is not reading this page.
 */

/** The names in a family worth a reader's eye, across all its groups. */
const emphasised = (family: TechnologyFamily) => family.groups.flatMap((group) => group.emphasis);

/**
 * A group's names with the emphasised ones first.
 *
 * Done here rather than by reordering `items` in the content file, so that
 * changing what is emphasised reflows the row on its own. Baking the split
 * into the stored order would mean every emphasis edit needed a matching
 * reorder, and the two would drift the first time one was forgotten.
 *
 * Both halves keep their own relative order, which the content file asks
 * callers not to disturb: within the tail it runs roughly from the names
 * nearest the emphasised ones outwards, so what follows the key tools reads as
 * related to them rather than as the rest of an alphabet.
 */
function ordered(group: TechnologyFamily["groups"][number]) {
  const key = new Set<string>(group.emphasis);
  return [...group.items.filter((i) => key.has(i)), ...group.items.filter((i) => !key.has(i))];
}

function Pill({ name, strong }: { name: string; strong?: boolean }) {
  return strong ? (
    <Badge>
      {name}
      {/* The fill is the whole signal and a screen reader gets none of it. */}
      <span className="sr-only"> (leaned on most)</span>
    </Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground font-normal">
      {name}
    </Badge>
  );
}

function Family({
  family,
  open,
  onToggle,
}: {
  family: TechnologyFamily;
  open: boolean;
  onToggle: (f: string) => void;
}) {
  const preview = emphasised(family);

  return (
    <section className="border-b py-3 last:border-b-0">
      {/* The whole header is the control, name and preview together, rather
          than a hit target the width of the words. A row of pills that opens
          when you click the heading beside it but not when you click the pills
          is a target a reader has to find.

          The preview is spans rather than a list because a button may only
          contain phrasing content, and `<ul>` inside one is invalid. The
          `aria-label` carries what the list semantics would have, which is what
          these names are: the ones leaned on most. */}
      <button
        type="button"
        onClick={() => onToggle(family.family)}
        aria-expanded={open}
        aria-label={open ? family.family : `${family.family}: ${preview.join(", ")}`}
        className="group hover:text-primary -ml-1 flex w-full cursor-pointer flex-wrap items-center gap-x-3 gap-y-1.5 py-1 text-left transition-colors"
      >
        <span className="flex shrink-0 items-center gap-1.5">
          <ChevronRight className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-90")} />
          <span className="text-sm font-medium">{family.family}</span>
        </span>

        {!open && preview.length > 0 && (
          /* The names inside this family that are leaned on most. Not a sample
             of the first few, which would be an accident of authoring order.

             Outlined, even though these are the emphasised names. A shut row
             has nothing to be emphasised against, so filling them would make
             the closed page a wall of solid pills and spend the fill on a
             distinction it is not drawing. The fill is held back for the open
             state, where there is a crowd for it to stand out from. */
          <span aria-hidden className="flex flex-wrap gap-1.5">
            {preview.map((item) => (
              <Pill key={item} name={item} />
            ))}
          </span>
        )}
      </button>

      {open && (
        <div className="mt-2 space-y-3 pl-5">
          {family.groups.map((group) => (
            <div key={group.group} className="sm:flex sm:gap-4">
              <h3 className="text-muted-foreground mb-1 shrink-0 text-xs leading-6 font-medium sm:mb-0 sm:w-44 sm:text-right">
                {group.group}
              </h3>
              <ul className="flex flex-1 flex-wrap gap-1.5">
                {ordered(group).map((item) => (
                  <li key={item}>
                    <Pill name={item} strong={group.emphasis.includes(item)} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function TechnologyFamilies() {
  const [open, setOpen] = React.useState<ReadonlySet<string>>(() => new Set());

  const toggle = React.useCallback((id: string) => {
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);

  return (
    <div>
      <div className="border-t">
        {technologies.map((family) => (
          <Family key={family.family} family={family} open={open.has(family.family)} onToggle={toggle} />
        ))}
      </div>
    </div>
  );
}
