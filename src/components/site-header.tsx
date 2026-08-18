import { Menu } from "lucide-react";
import * as React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { site } from "@/content/site";
import { notes } from "@/lib/notes";
import { cn } from "@/lib/utils";

/**
 * Notes is conditional. They are kept in the repo whether or not they are
 * published, so a nav item that is always present would sometimes lead to an
 * empty page — it appears once there is something behind it.
 */
const links = [
  { to: "/", label: "About", end: true },
  { to: "/publications", label: "Publications" },
  { to: "/domains", label: "Domains" },
  ...(notes.length > 0 ? [{ to: "/notes", label: "Notes" }] : []),
];

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
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                cn(
                  "rounded-md px-2.5 py-1.5 text-sm transition-colors",
                  isActive ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
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
              {links.map((link) => (
                <SheetClose asChild key={link.to}>
                  <NavLink
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) =>
                      cn(
                        "rounded-md px-3 py-2 text-sm transition-colors",
                        isActive ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/60",
                      )
                    }
                  >
                    {link.label}
                  </NavLink>
                </SheetClose>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
