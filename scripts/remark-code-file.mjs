/**
 * `<CodeFile path="python/demos/torch_dataclass.py" />` becomes a fenced code
 * block holding that file's real contents, and `<SourceCode path="..." />` becomes
 * the same block wrapped in the panel that folds it away.
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
 *
 * `<SourceCode>` takes the same `path` and is expanded here rather than in the note,
 * so a listing names its file once. Writing the fence by hand inside the panel
 * meant the path appeared twice and the two could disagree, which is the failure
 * `CodeFile` exists to prevent, reintroduced one level up. A `<SourceCode>` that
 * already has children is left alone, for the case where the block is not a whole
 * file.
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

/** The fence a `path` stands for, or `null` after reporting why it could not be read. */
function fence(node, file, { path, lang, lines }, meta) {
  let source;
  try {
    source = readFileSync(resolve(root, path), "utf8");
  } catch {
    // Failing the build is right: a note pointing at a file that has moved
    // would otherwise render as nothing at all.
    file.fail(`<${node.name} path="${path}"> could not be read`, node);
    return null;
  }

  return {
    type: "code",
    lang: lang ?? LANGUAGES[extname(path)] ?? "text",
    meta,
    value: slice(source, lines).trimEnd(),
  };
}

export default function remarkCodeFile() {
  return (tree, file) => {
    visit(tree, "mdxJsxFlowElement", (node, index, parent) => {
      if (!parent) return;

      if (node.name === "CodeFile") {
        const found = attributes(node);
        if (!found.path) {
          file.fail("<CodeFile> needs a `path` attribute", node);
          return;
        }
        // rehype-pretty-code reads `title="..."` out of the fence meta and
        // renders it as the caption above the block.
        const block = fence(node, file, found, `title="${found.title ?? found.path}"`);
        if (block) parent.children[index] = block;
        return;
      }

      if (node.name === "SourceCode") {
        const found = attributes(node);
        if (!found.path || node.children.length > 0) return;
        // No title: the panel's own bar already names the file, and a second
        // banner inside it was the thing that made one component look like two.
        // Line numbers, because a `<SourceCode>` is a whole file rather than the few
        // lines a fence in prose carries, and a reader referring to part of it
        // needs a way to say which part.
        const block = fence(node, file, found, "showLineNumbers");
        if (block) node.children = [block];
        return;
      }
    });
  };
}
