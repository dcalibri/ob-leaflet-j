import { describe, expect, it } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { LeafletTransformer } from "../src/transformer";
import { createCtx } from "./helpers";

describe("LeafletTransformer", () => {
  it("transforms leaflet codeblocks to HTML", async () => {
    const ctx = createCtx();
    const transformer = LeafletTransformer();
    const plugins = transformer.markdownPlugins?.(ctx) ?? [];

    const file = await unified()
      .use(remarkParse)
      .use(plugins)
      .use(remarkStringify)
      .process(`
\`\`\`leaflet
id: test-map
lat: -6.2
long: 106.8
defaultZoom: 5
\`\`\`
`);

    const output = String(file);
    expect(output).toContain("leaflet");
    expect(output).toContain("L.map");
  });
});