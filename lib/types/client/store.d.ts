/**
 * Settings card state store and host contract types.
 *
 * {@link CardStore} owns the draft ↔ scope ↔ credential lifecycle for the
 * settings card. It stages non-secret field edits locally, commits them
 * through the DSH settings scope, and writes keys only through the DSH
 * credentials API. Structural host contracts (`SettingsScope`, `Mirror`,
 * `CredentialsApi`) are declared as interfaces so the browser bundle stays
 * free of host runtime imports.
 *
 * @module dsh-web-search-zai/client/store
 */
/** Structural host contracts keep the browser bundle free of host runtime imports. */
export declare const NAMESPACE = "web-search-zai";
export declare const FIELDS: readonly ["billingMode", "apiKeyEnv", "mcpURL", "baseURL", "searchEngine", "searchRecency"];
export type Field = typeof FIELDS[number];
export type Values = Partial<Record<Field, string>>;
export type Op = {
    op: 'set';
    path: string[];
    value: string;
} | {
    op: 'unset';
    path: string[];
};
export interface ScopeSnapshot {
    status: 'loading' | 'ready' | 'unavailable';
    value: Values | undefined;
    user: unknown;
    revision: number | undefined;
    writable: boolean;
    mode: 'host' | 'memory';
}
export interface SettingsScope {
    getSnapshot(): ScopeSnapshot;
    subscribe(listener: () => void): () => void;
    mutate(ops: readonly Op[], expectedRevision?: number): Promise<void>;
}
export interface Mirror {
    getSnapshot(): {
        view?: {
            namespaces: {
                ns: string;
                secrets?: {
                    path: string[];
                    set: boolean;
                }[];
            }[];
        };
    };
    subscribe(listener: () => void): () => void;
}
export interface CredentialsApi {
    describe(input: {
        refs: string[];
    }): Promise<{
        result?: {
            ok?: boolean;
            value?: {
                credentials?: Record<string, {
                    configured?: boolean;
                    writable?: boolean;
                }>;
            };
        };
    }>;
    set(input: {
        ref: string;
        value: string;
    }): Promise<{
        result?: {
            ok?: boolean;
        };
    }>;
}
export type Message = 'saved' | 'settingsFailed' | 'keyFailed' | 'partialSave' | 'resetDone' | 'stale' | 'invalid';
export interface CardState {
    scope: ScopeSnapshot;
    draft: Values;
    draftRevision: number | undefined;
    saving: boolean;
    configured: boolean;
    keyWritable: boolean;
    literalKey: boolean;
    message: Message | undefined;
}
/**
 * Reactive state store for the settings card.
 *
 * Bridges the DSH settings scope and credentials API into a single
 * subscribe/getSnapshot contract that React can consume via
 * `useSyncExternalStore`. Edits are staged locally until {@link save}
 * commits them atomically with revision checks.
 */
export declare class CardStore {
    private readonly scope;
    private readonly mirror;
    private readonly credentials;
    private state;
    private readonly listeners;
    private readonly cleanups;
    private disposed;
    private credentialGeneration;
    constructor(scope: SettingsScope, mirror: Mirror, credentials: CredentialsApi | undefined);
    getSnapshot: () => CardState;
    subscribe: (listener: () => void) => (() => void);
    private update;
    private refresh;
    keyRef(): string;
    /** Re-query the credentials API for the current key reference's status. */
    refreshCredential(): Promise<void>;
    /** Stage a field edit locally. Has no effect while a save is in progress. */
    edit(field: Field, value: string): void;
    discard(): void;
    private ready;
    private commit;
    /**
     * Commit staged edits and an optional key to the host.
     *
     * Settings fields are written first; if that succeeds and a non-empty key
     * was provided, the key is written through the credentials API. A failed
     * key write after a successful settings save is reported as `partialSave`.
     *
     * @returns `true` when all writes succeeded.
     */
    save(key: string, keyRevision?: number): Promise<boolean>;
    /** Clear all non-secret user overrides, restoring inherited values. Keeps the shared key. */
    reset(): Promise<boolean>;
    dispose(): void;
}
//# sourceMappingURL=store.d.ts.map