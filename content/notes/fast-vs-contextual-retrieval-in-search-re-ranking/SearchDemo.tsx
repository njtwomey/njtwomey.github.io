import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

/**
 * The interactive demo for this note, and only this note.
 *
 * It lives beside the prose it belongs to rather than under `src/components`,
 * because nothing else will ever render it and a component in `src` is a
 * component every future note has to scroll past. Vite resolves the relative
 * import from the MDX file and rollup puts it in this note's own chunk, so a
 * reader of any other note never downloads it.
 *
 * Site components are still imported normally through `@/`, which is how this
 * gets shadcn's `Input` without vendoring one.
 *
 * Not wired yet. The controls are inert and the results are illustrative: the
 * point of building the shell first is to fix what the demo has to show, which
 * is that the plateau moves with the retriever rather than with the re-ranker.
 */
export function SearchDemo() {
  return (
    <div className="bg-muted/20 my-6 rounded-xl border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input disabled placeholder="something warm that is not too spicy" className="h-9 pl-9" aria-label="Query" />
        </div>
        <ToggleGroup type="single" value="bm25" variant="outline" size="sm" spacing={0} className="h-9 *:h-9" disabled>
          <ToggleGroupItem value="bm25" className="px-3 text-xs">
            BM25
          </ToggleGroupItem>
          <ToggleGroupItem value="splade" className="px-3 text-xs">
            SPLADE++
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <p className="text-muted-foreground mt-3 text-xs">
        Not wired up yet. Switching the retriever should move the point at which extra candidates stop earning their
        latency, from beyond a thousand behind BM25 to about twenty behind SPLADE++.
      </p>
    </div>
  );
}
