import * as React from "react";
import { Navigate, Route, BrowserRouter as Router, Routes, useLocation } from "react-router-dom";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { loadDetails } from "@/lib/publications";
import { About } from "@/routes/about";

/**
 * About is in the main bundle because it is what most people load first;
 * everything else is split. Publications carries the whole bibliography with
 * abstracts, which is the largest single thing on the site and has no business
 * being downloaded by someone who came to read the front page.
 */
/**
 * Routes that render full paper cards pull the abstracts and BibTeX records in
 * alongside their own chunk, so both have arrived before the first render and
 * a card can read them synchronously.
 */
async function withPaperDetails<T>(load: Promise<T>, pick: (module: T) => React.ComponentType) {
  const [module] = await Promise.all([load, loadDetails()]);
  return { default: pick(module) };
}

const Publications = React.lazy(() => withPaperDetails(import("@/routes/publications"), (m) => m.Publications));
const Note = React.lazy(() => withPaperDetails(import("@/routes/note"), (m) => m.Note));
const Practice = React.lazy(() => import("@/routes/practice").then((m) => ({ default: m.Practice })));
const Technologies = React.lazy(() => import("@/routes/technologies").then((m) => ({ default: m.Technologies })));
const Notes = React.lazy(() => import("@/routes/notes").then((m) => ({ default: m.Notes })));

/**
 * Put the page where the URL says it should be after a navigation.
 *
 * Without a hash that means the top, since a client-side navigation otherwise
 * keeps the old scroll position and lands you halfway down a page you have not
 * read.
 *
 * With a hash it means the element, and the browser cannot be left to do it.
 * Every route here is `React.lazy`, so on a cold load of
 * `/practice#theme-building-and-shipping` the browser looks for the element
 * while the Suspense fallback is still on screen, does not find it, and never
 * looks again. The element appears a few frames later and the reader is at the
 * top of the page wondering what the link was for.
 *
 * So watch for it. `scrollIntoView` rather than `scrollTo` because the offset
 * for the sticky header is already expressed as `scroll-padding-top` on `html`
 * and `scroll-mt-*` on the targets, and those are exactly what it honours.
 */
function ScrollOnNavigate() {
  const { pathname, hash } = useLocation();

  React.useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }

    const id = decodeURIComponent(hash.slice(1));
    const jump = () => {
      const target = document.getElementById(id);
      target?.scrollIntoView();
      return Boolean(target);
    };
    if (jump()) return;

    // Not rendered yet. Watch the tree rather than polling, and give up after a
    // few seconds so a hash naming nothing does not leave an observer running.
    const observer = new MutationObserver(() => {
      if (jump()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const timeout = window.setTimeout(() => observer.disconnect(), 5000);

    return () => {
      observer.disconnect();
      window.clearTimeout(timeout);
    };
  }, [pathname, hash]);

  return null;
}

function RouteFallback() {
  return (
    <div className="mx-auto w-full max-w-4xl flex-1 space-y-4 px-5 py-16 sm:px-6">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  );
}

export default function App() {
  return (
    <TooltipProvider delayDuration={200}>
      <Router basename={import.meta.env.BASE_URL}>
        <ScrollOnNavigate />
        <div className="flex min-h-dvh flex-col">
          <SiteHeader />
          <React.Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<About />} />
              <Route path="/publications" element={<Publications />} />
              <Route path="/practice" element={<Practice />} />
              <Route path="/technologies" element={<Technologies />} />
              {/* /domains was this page's path until it was renamed. The
                  catch-all below would swallow the old URL and land anyone
                  following an existing link on the front page without saying
                  why, so the redirect is explicit and has to stay above it. */}
              <Route path="/domains" element={<Navigate to="/practice" replace />} />
              {/* /domains/detail used to sit here behind a flag, holding a
                  paragraph per capability. A flag was the wrong tool: it kept
                  the route unregistered and shipped every paragraph to every
                  visitor anyway, because the matrix imported the module the
                  prose lived in. The prose is now out of the tree entirely and
                  archived in .scratch/domains/, and the catch-all below sends
                  anyone with the old URL back to the front page. */}
              <Route path="/notes" element={<Notes />} />
              <Route path="/notes/:slug" element={<Note />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </React.Suspense>
          <SiteFooter />
        </div>
      </Router>
    </TooltipProvider>
  );
}
