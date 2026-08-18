/**
 * `<CodeFile path="python/demos/torch_dataclass.py" />` becomes a fenced code
 * block holding that file's real contents.
 *
 * The point is that a note showing code and a script that runs should never be
 * two copies of the same thing. Quoting a snippet by hand means it drifts from
 * the file the moment either changes, and the reader has no way of knowing
 * which one is stale.
 *
 * This runs on the mdast before it becomes hast, so what it produces is an
 * ordinary code node and rehype-pretty-code highlights it like any other fence.
 * There is no runtime cost and no second highlighting path to keep in step.
 *
 * Attributes:
 *   path   repo-relative path to read. Required.
 *   lang   override the language, which is otherwise taken from the extension.
 *   title  override the caption, which is otherwise the path.
 *   lines  "12-48", to show a slice rather than the whole file.
 */
import { readFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { visit } from "unist-util-visit";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const LANGUAGES = {
  ".py": "python",
  ".ts": "ts",
  ".tsx": "tsx",
  ".js": "js",
  ".jsx": "jsx",
  ".mjs": "js",
  ".json": "json",
  ".sh": "bash",
  ".bash": "bash",
  ".yml": "yaml",
  ".yaml": "yaml",
  ".toml": "toml",
  ".css": "css",
  ".md": "markdown",
  ".mdx": "mdx",
  ".bib": "bibtex",
};

function attributes(node) {
  const found = {};
  for (const attribute of node.attributes ?? []) {
    if (attribute.type === "mdxJsxAttribute" && typeof attribute.value === "string") {
      found[attribute.name] = attribute.value;
    }
  }
  return found;
}

function slice(source, lines) {
  const range = lines?.match(/^(\d+)\s*-\s*(\d+)$/);
  if (!range) return source;
  return source
    .split("\n")
    .slice(Number(range[1]) - 1, Number(range[2]))
    .join("\n");
}

export default function remarkCodeFile() {
  return (tree, file) => {
    visit(tree, "mdxJsxFlowElement", (node, index, parent) => {
      if (node.name !== "CodeFile" || !parent) return;

      const { path, lang, title, lines } = attributes(node);
      if (!path) {
        file.fail("<CodeFile> needs a `path` attribute", node);
        return;
      }

      let source;
      try {
        source = readFileSync(resolve(root, path), "utf8");
      } catch {
        // Failing the build is right: a note pointing at a file that has moved
        // would otherwise render as nothing at all.
        file.fail(`<CodeFile path="${path}"> could not be read`, node);
        return;
      }

      parent.children[index] = {
        type: "code",
        lang: lang ?? LANGUAGES[extname(path)] ?? "text",
        // rehype-pretty-code reads `title="..."` out of the fence meta and
        // renders it as the caption above the block.
        meta: `title="${title ?? path}"`,
        value: slice(source, lines).trimEnd(),
      };
    });
  };
}
