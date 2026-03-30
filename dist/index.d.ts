import { QuartzTransformerPlugin, QuartzFilterPlugin, QuartzEmitterPlugin, QuartzComponent } from '@quartz-community/types';
export { PageGenerator, PageMatcher, QuartzComponent, QuartzComponentConstructor, QuartzComponentProps, QuartzEmitterPlugin, QuartzFilterPlugin, QuartzPageTypePlugin, QuartzPageTypePluginInstance, QuartzTransformerPlugin, StringResource, VirtualPage } from '@quartz-community/types';

interface ExampleTransformerOptions {
    /** Token used to highlight text, defaults to ==highlight== */
    highlightToken: string;
    /** Add a CSS class to all headings in the rendered HTML. */
    headingClass: string;
    /** Enable remark-gfm for tables/task lists. */
    enableGfm: boolean;
    /** Enable adding slug IDs to headings. */
    addHeadingSlugs: boolean;
}
interface ExampleFilterOptions {
    /** Allow pages marked draft: true to publish. */
    allowDrafts: boolean;
    /** Exclude pages that contain any of these frontmatter tags. */
    excludeTags: string[];
    /** Exclude paths that start with any of these prefixes (relative to content root). */
    excludePathPrefixes: string[];
}
interface ExampleEmitterOptions {
    /** Filename to emit at the site root. */
    manifestSlug: string;
    /** Whether to include the frontmatter block in the manifest. */
    includeFrontmatter: boolean;
    /** Extra metadata to write at the top level of the manifest. */
    metadata: Record<string, unknown>;
    /** Optional hook to transform the emitted manifest JSON string. */
    transformManifest?: (json: string) => string;
    /** Add a custom class to the emitted manifest <script> tag if used in HTML. */
    manifestScriptClass?: string;
}

/**
 * Example transformer showing remark/rehype usage and resource injection.
 */
declare const ExampleTransformer: QuartzTransformerPlugin<Partial<ExampleTransformerOptions>>;

/**
 * Example filter that removes drafts, tagged pages, and excluded path prefixes.
 */
declare const ExampleFilter: QuartzFilterPlugin<Partial<ExampleFilterOptions>>;

/**
 * Example emitter that writes a JSON manifest of content metadata.
 */
declare const ExampleEmitter: QuartzEmitterPlugin<Partial<ExampleEmitterOptions>>;

interface ExampleComponentOptions {
    prefix?: string;
    suffix?: string;
    className?: string;
}
declare const _default: (opts?: ExampleComponentOptions) => QuartzComponent;

export { _default as ExampleComponent, type ExampleComponentOptions, ExampleEmitter, type ExampleEmitterOptions, ExampleFilter, type ExampleFilterOptions, ExampleTransformer, type ExampleTransformerOptions };
