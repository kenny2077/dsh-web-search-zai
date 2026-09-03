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
/** The card stages only non-secret fields. A typed key lives in the form until Save. */
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
    refreshCredential(): Promise<void>;
    edit(field: Field, value: string): void;
    discard(): void;
    private ready;
    private commit;
    save(key: string, keyRevision?: number): Promise<boolean>;
    reset(): Promise<boolean>;
    dispose(): void;
}
//# sourceMappingURL=store.d.ts.map