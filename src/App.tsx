import * as React from "react";
import { Navigate, Route, BrowserRouter as Router, Routes, useLocation } from "react-router-dom";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DOMAINS_DETAIL } from "@/lib/flags";
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
const Domains = React.lazy(() => import("@/routes/domains").then((m) => ({ default: m.Domains })));
const DomainsDetail = React.lazy(() => import("@/routes/domains-detail").then((m) => ({ default: m.DomainsDetail })));
const Notes = React.lazy(() => import("@/routes/notes").then((m) => ({ default: m.Notes })));

/**
 * A client-side navigation keeps the old scroll position, which lands you
 * halfway down a page you have not read. Anchored links (#twomey2019neural)
 * are the exception — those are meant to jump.
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  React.useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
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
        <ScrollToTop />
        <div className="flex min-h-dvh flex-col">
          <SiteHeader />
          <React.Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<About />} />
              <Route path="/publications" element={<Publications />} />
              <Route path="/domains" element={<Domains />} />
              {/* Written, kept compiled, not published. See src/lib/flags.ts.
                  Unregistering the route rather than hiding the link is what
                  makes it genuinely absent: the catch-all below sends anyone
                  who guesses the URL back to the front page. */}
              {DOMAINS_DETAIL && <Route path="/domains/detail" element={<DomainsDetail />} />}
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
