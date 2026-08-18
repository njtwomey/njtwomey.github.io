declare module "*.mdx" {
  import type { ComponentType } from "react";
  import type { NoteMeta } from "@/lib/notes";

  /** Frontmatter, exported by remark-mdx-frontmatter (configured in vite.config.ts). */
  export const meta: NoteMeta;

  const MDXComponent: ComponentType<{ components?: Record<string, ComponentType<Record<string, unknown>>> }>;
  export default MDXComponent;
}
