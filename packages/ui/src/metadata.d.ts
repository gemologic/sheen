/** Build-time documentation data. Never imported by the component runtime entry point. */
export interface PropMetadata {
    readonly description: string;
    readonly default?: string | number | boolean | null;
    readonly control?: {
        readonly kind: "boolean" | "text";
    } | {
        readonly kind: "select";
        readonly values: readonly (string | number | boolean | null)[];
    };
}
export type ComposerMetadataParentRegion = "root" | "topbar" | "sidebar" | "page-header" | "toolbar" | "main-grid" | "details-panel" | "status-bar" | "overlays";
export interface ComposerMetadata {
    readonly allowedParentRegions: readonly ComposerMetadataParentRegion[];
    readonly acceptedChildRegions: readonly string[];
    readonly editableSafeProps: readonly string[];
    readonly fixtureFactory: string;
    readonly codeGenerationAdapter: string;
}
export interface ComponentMetadata {
    readonly name: string;
    readonly package: string;
    readonly category: string;
    readonly summary: string;
    readonly props: Readonly<Record<string, PropMetadata>>;
    readonly tokens: readonly string[];
    readonly a11y: {
        readonly role: string;
        readonly keyboard: readonly string[];
    };
    readonly examples: readonly {
        readonly title: string;
        readonly code: string;
        readonly imports?: string;
        readonly setup?: string;
    }[];
    readonly guidance: {
        readonly do: readonly string[];
        readonly dont: readonly string[];
    };
    readonly composer?: ComposerMetadata;
}
export declare function defineMeta<Props>(metadata: Omit<ComponentMetadata, "props"> & {
    readonly props: Partial<Record<keyof Props, PropMetadata>>;
}): ComponentMetadata;
export declare function isComponentMetadata(value: unknown): value is ComponentMetadata;
