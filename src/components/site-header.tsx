import { ChevronDown, Menu } from "lucide-react";
import * as React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { site } from "@/content/site";
import { hasNotes } from "@/lib/notes-summary";
import { cn } from "@/lib/utils";

/**
 * A nav entry is either a page or a group of pages behind one label.
 *
 * ML Practice and Technologies are two views of the same subject, which is what
 * the work has consisted of and what it was done with. As siblings of About and
 * Publications they made the bar read as five unrelated destinations and buried
 * Projects among them; under one label the bar states four things and the two
 * that belong together say so.
 */
type NavItem = { to: string; label: string; end?: boolean };
type NavGroup = { label: string; items: readonly NavItem[] };
type NavEntry = NavItem | NavGroup;

const isGroup = (entry: NavEntry): entry is NavGroup => "items" in entry;

/**
 * Notes is conditional. They are kept in the repo whether or not they are
 * published, so a nav item that is always present would sometimes lead to an
 * empty page. It appears once there is something behind it.
 */
const links: readonly NavEntry[] = [
  { to: "/", label: "About", end: true },
  { to: "/publications", label: "Publications" },
  { to: "/projects", label: "Projects" },
  {
    label: "Experience",
    items: [
      // First, because it says where and when, and the two under it say what.
      { to: "/career", label: "Career" },
      { to: "/practice", label: "ML Practice" },
      { to: "/technologies", label: "Technologies" },
    ],
  },
  ...(hasNotes ? [{ to: "/notes", label: "Notes" }] : []),
];

/**
 * Whether a path is the one being shown.
 *
 * The sheet needs this rather than `NavLink`'s own `isActive`. Radix's `asChild`
 * clones the child and merges `className` as a string, so a function passed
 * there is never called and the active state silently never arrives. Every link
 * in the sheet was rendering in its resting style because of it, and the
 * grouped ones lost their `block` and sat side by side on one line.
 */
const matches = (pathname: string, to: string, end?: boolean) =>
  end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);

/** One link in the sheet, in its two states. */
const SHEET_LINK = "block rounded-md px-3 py-2 text-sm transition-colors";
const SHEET_ACTIVE = "bg-muted font-medium";
const SHEET_RESTING = "text-muted-foreground hover:bg-muted/60";

/** The shared shape of a top-level nav control, so a link and a trigger match. */
const ENTRY = "rounded-md px-2.5 py-1.5 text-sm transition-colors";
const ACTIVE = "text-foreground font-medium";
const RESTING = "text-muted-foreground hover:text-foreground";

/**
 * A group as a dropdown, which is active when any page inside it is.
 *
 * The trigger is not itself a link. There is no page at `/experience` and
 * inventing one to have somewhere to point would mean writing a page whose only
 * content is the two links already in the menu. A button that opens the menu is
 * what the control actually does.
 */
function NavGroupMenu({ group }: { group: NavGroup }) {
  const { pathname } = useLocation();
  const active = group.items.some((item) => matches(pathname, item.to));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={cn(ENTRY, "flex items-center gap-1", active ? ACTIVE : RESTING)}>
          {group.label}
          <ChevronDown className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-40">
        {group.items.map((item) => (
          <DropdownMenuItem key={item.to} asChild>
            <NavLink to={item.to} className={cn("cursor-pointer", pathname === item.to && "font-medium")}>
              {item.label}
            </NavLink>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SiteHeader() {
  const [open, setOpen] = React.useState(false);
  const location = useLocation();

  // A tap on the open sheet's current page should still close it.
  React.useEffect(() => setOpen(false), [location.pathname]);

  return (
    <header className="bg-background/80 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-4xl items-center gap-3 px-5 sm:px-6">
        <NavLink to="/" className="hover:text-primary mr-auto text-sm font-semibold tracking-tight">
          {site.shortName}
        </NavLink>

        <nav className="hidden items-center gap-1 sm:flex">
          {links.map((entry) =>
            isGroup(entry) ? (
              <NavGroupMenu key={entry.label} group={entry} />
            ) : (
              <NavLink
                key={entry.to}
                to={entry.to}
                end={entry.end}
                className={({ isActive }) => cn(ENTRY, isActive ? ACTIVE : RESTING)}
              >
                {entry.label}
              </NavLink>
            ),
          )}
        </nav>

        {/* Throwaway, with the lazy import above. */}
        <ThemeToggle />

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="sm:hidden" aria-label="Open menu">
              <Menu className="size-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64 p-6">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <nav className="mt-6 flex flex-col gap-1">
              {links.map((entry) =>
                /* A group is flattened into a labelled section rather than
                   repeated as a dropdown. A menu inside a sheet is a second
                   layer of disclosure to reach a page that is already one tap
                   away, and on a phone the sheet has the room the bar does not. */
                isGroup(entry) ? (
                  <div key={entry.label} className="mt-3 flex flex-col gap-1 first:mt-0">
                    <p className="text-muted-foreground/70 px-3 pt-2 pb-1 text-xs font-medium">{entry.label}</p>
                    {entry.items.map((item) => (
                      <SheetClose asChild key={item.to}>
                        <NavLink
                          to={item.to}
                          className={cn(SHEET_LINK, matches(location.pathname, item.to) ? SHEET_ACTIVE : SHEET_RESTING)}
                        >
                          {item.label}
                        </NavLink>
                      </SheetClose>
                    ))}
                  </div>
                ) : (
                  <SheetClose asChild key={entry.to}>
                    <NavLink
                      to={entry.to}
                      end={entry.end}
                      className={cn(
                        SHEET_LINK,
                        matches(location.pathname, entry.to, entry.end) ? SHEET_ACTIVE : SHEET_RESTING,
                      )}
                    >
                      {entry.label}
                    </NavLink>
                  </SheetClose>
                ),
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
