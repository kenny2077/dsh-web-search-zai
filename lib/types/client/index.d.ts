import type { CredentialsApi, Mirror, Op, SettingsScope } from './store.ts';
export interface ClientContext {
    get(service: 'connection'): {
        api: {
            credentials: CredentialsApi;
            settings?: {
                mutate(input: {
                    ns: string;
                    ops: readonly Op[];
                    expectedRevision?: number;
                }): Promise<{
                    result: {
                        ok: boolean;
                        value?: unknown;
                    };
                }>;
            };
        };
    } | undefined;
    settingsScope: {
        bind(spec: {
            namespace: string;
        }): Omit<SettingsScope, 'mutate'> & Partial<Pick<SettingsScope, 'mutate'>>;
        describe(): Mirror & {
            acceptView?(view: unknown): void;
        };
    };
    locale: {
        bind(namespace: string): (key: string) => string;
        register(namespace: string, dictionaries: unknown): unknown;
    };
    slots: {
        inject(slot: string, factory: () => unknown): unknown;
        register(definition: Record<string, unknown>, component: unknown): unknown;
    };
    remote: {
        $on(event: string, handler: (ref: string) => void): unknown;
    };
    on(event: string, handler: () => void): unknown;
    effect(install: () => unknown, label: string): unknown;
}
export declare const inject: string[];
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map