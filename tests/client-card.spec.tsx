import { afterEach, describe, expect, it, vi } from 'vitest'
import * as React from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import { act, create } from 'react-test-renderer'
import type { ReactTestRenderer } from 'react-test-renderer'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { CardStore, FIELDS } from '../src/client/store.ts'
import type { CredentialsApi, Mirror, ScopeSnapshot, SettingsScope, Values } from '../src/client/store.ts'
import { Card } from '../src/client/card.tsx'
import { en, zh } from '../src/client/locales.ts'
import { apply } from '../src/client/index.tsx'
import type { ClientContext } from '../src/client/index.tsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const cleanup: (() => void)[] = []
afterEach(async () => { await act(async () => { for (const fn of cleanup.splice(0)) fn() }) })

function fixture(initial: Values = {}, literalKey = false) {
  const base = { billingMode: 'coding-plan', apiKeyEnv: 'ZAI_API_KEY', ...initial }
  let snapshot: ScopeSnapshot = { status: 'ready', value: base, user: {}, revision: 1, writable: true, mode: 'host' }
  const listeners = new Set<() => void>()
  const mirrorListeners = new Set<() => void>()
  let reject = false
  const emit = () => { for (const listener of listeners) listener(); for (const listener of mirrorListeners) listener() }
  const scope: SettingsScope = {
    getSnapshot: () => snapshot,
    subscribe: listener => { listeners.add(listener); return () => { listeners.delete(listener) } },
    mutate: vi.fn(async (ops, expectedRevision) => {
      if (reject || expectedRevision !== snapshot.revision) return
      const user = { ...snapshot.user as Record<string, string> }
      for (const op of ops) {
        if (op.op === 'unset') delete user[op.path[0]!]
        else user[op.path[0]!] = op.value
      }
      snapshot = { ...snapshot, value: { ...base, ...user }, user, revision: snapshot.revision! + 1 }
      emit()
    }),
  }
  const mirror: Mirror = {
    getSnapshot: () => ({ view: { namespaces: [{ ns: 'web-search-zai', secrets: [{ path: ['apiKey'], set: literalKey }] }] } }),
    subscribe: listener => { mirrorListeners.add(listener); return () => { mirrorListeners.delete(listener) } },
  }
  const credentials: CredentialsApi = {
    describe: vi.fn(async ({ refs }) => ({ result: { ok: true, value: { credentials: { [refs[0]!]: { configured: true, writable: true } } } } })),
    set: vi.fn(async () => ({ result: { ok: true } })),
  }
  const store = new CardStore(scope, mirror, credentials)
  cleanup.push(() => store.dispose())
  return {
    store, scope, mirror, credentials, listeners, mirrorListeners,
    reject: () => { reject = true },
    external: (patch: Partial<ScopeSnapshot>) => { snapshot = { ...snapshot, ...patch }; emit() },
  }
}

describe('settings card persistence', () => {
  it('reads saved values on open and reflects external changes', async () => {
    const f = fixture({ billingMode: 'api' })
    expect(f.store.getSnapshot().scope.value?.billingMode).toBe('api')
    f.external({ value: { billingMode: 'coding-plan' }, revision: 2 })
    expect(f.store.getSnapshot().scope.value?.billingMode).toBe('coding-plan')
    const reopened = new CardStore(f.scope, f.mirror, f.credentials)
    expect(reopened.getSnapshot().scope.value?.billingMode).toBe('coding-plan')
    reopened.dispose()
  })
  it('saves only edited non-secret fields and preserves a blank key', async () => {
    const f = fixture()
    f.store.edit('billingMode', 'api')
    expect(await f.store.save('')).toBe(true)
    expect(f.scope.mutate).toHaveBeenCalledWith([{ op: 'set', path: ['billingMode'], value: 'api' }], 1)
    expect(f.credentials.set).not.toHaveBeenCalled()
    expect(f.store.getSnapshot().message).toBe('saved')
  })
  it('writes keys only to the configured credential reference', async () => {
    const f = fixture({ apiKeyEnv: 'CUSTOM_ZAI_KEY' })
    await f.store.refreshCredential()
    expect(await f.store.save('a-secret', 1)).toBe(true)
    expect(f.credentials.set).toHaveBeenCalledWith({ ref: 'CUSTOM_ZAI_KEY', value: 'a-secret' })
    expect(f.scope.mutate).not.toHaveBeenCalled()
    expect(JSON.stringify(f.store.getSnapshot())).not.toContain('a-secret')
  })
  it('reset clears only the owned non-secret overrides and keeps the key', async () => {
    const f = fixture({ billingMode: 'api' })
    f.external({ user: { billingMode: 'coding-plan', apiKey: 'redacted-placeholder', unrelated: 'keep' } })
    expect(await f.store.reset()).toBe(true)
    expect(f.scope.mutate).toHaveBeenCalledWith(FIELDS.map(field => ({ op: 'unset', path: [field] })), 1)
    expect(f.scope.getSnapshot().value?.billingMode).toBe('api')
    expect(f.scope.getSnapshot().user).toEqual({ apiKey: 'redacted-placeholder', unrelated: 'keep' })
    expect(f.credentials.set).not.toHaveBeenCalled()
  })
  it('rejects stale drafts and stale keys without overwriting newer settings', async () => {
    const f = fixture()
    f.store.edit('billingMode', 'api')
    f.external({ revision: 2 })
    expect(await f.store.save('')).toBe(false)
    expect(f.store.getSnapshot().message).toBe('stale')
    expect(f.scope.mutate).not.toHaveBeenCalled()
    f.store.discard()
    f.store.edit('searchEngine', 'search-prime')
    expect(await f.store.save('secret', 1)).toBe(false)
    expect(f.credentials.set).not.toHaveBeenCalled()
  })
  it('does not claim success when the host silently rejects a settings write', async () => {
    const f = fixture()
    f.reject()
    f.store.edit('billingMode', 'api')
    expect(await f.store.save('secret', 1)).toBe(false)
    expect(f.store.getSnapshot().message).toBe('settingsFailed')
    expect(f.credentials.set).not.toHaveBeenCalled()
    expect(await f.store.reset()).toBe(true) // Already inherited: requested state is verified.
  })
  it('reports settings success with a failed key as a partial save', async () => {
    const f = fixture()
    vi.mocked(f.credentials.set).mockResolvedValue({ result: { ok: false } })
    f.store.edit('billingMode', 'api')
    expect(await f.store.save('secret', 1)).toBe(false)
    expect(f.store.getSnapshot()).toMatchObject({ message: 'partialSave', saving: false, draft: {} })
    expect(f.scope.getSnapshot().value?.billingMode).toBe('api')
    expect(await f.store.save('secret', 2)).toBe(false)
    expect(f.store.getSnapshot().message).toBe('keyFailed')
  })
  it('refuses a key write if the credential reference changes during preflight', async () => {
    const f = fixture()
    await f.store.refreshCredential()
    vi.mocked(f.credentials.describe).mockImplementationOnce(async () => {
      f.external({ value: { apiKeyEnv: 'OTHER_KEY' }, revision: 2 })
      return { result: { ok: true, value: { credentials: { ZAI_API_KEY: { configured: true, writable: true } } } } }
    })
    expect(await f.store.save('secret', 1)).toBe(false)
    expect(f.credentials.set).not.toHaveBeenCalled()
  })
  it('keeps literal-key precedence and never overwrites it', async () => {
    const f = fixture({}, true)
    expect(f.store.getSnapshot().literalKey).toBe(true)
    expect(await f.store.save('new-key')).toBe(false)
    expect(f.credentials.set).not.toHaveBeenCalled()
  })
  it.each([{ writable: false }, { status: 'unavailable' as const }, { mode: 'memory' as const }])('blocks writes on unavailable or read-only settings: %o', async patch => {
    const f = fixture()
    f.external(patch)
    f.store.edit('billingMode', 'api')
    expect(await f.store.save('secret')).toBe(false)
    expect(await f.store.reset()).toBe(false)
    expect(f.scope.mutate).not.toHaveBeenCalled()
    expect(f.credentials.set).not.toHaveBeenCalled()
  })
  it('rejects malformed endpoints before saving', async () => {
    const f = fixture()
    f.store.edit('mcpURL', 'file:///tmp/secret')
    expect(await f.store.save('')).toBe(false)
    expect(f.store.getSnapshot().message).toBe('invalid')
    expect(f.scope.mutate).not.toHaveBeenCalled()
  })
  it('unsubscribes and refuses new work after disposal', async () => {
    const f = fixture()
    f.store.dispose()
    expect(f.listeners.size).toBe(0)
    expect(f.mirrorListeners.size).toBe(0)
    expect(await f.store.save('secret')).toBe(false)
  })
})

describe('settings card rendering and browser package', () => {
  it.each([en, zh])('renders saved selections, switches advanced controls, and masks keys', async dictionary => {
    const f = fixture()
    let renderer!: ReactTestRenderer
    await act(async () => { renderer = create(<Card store={f.store} t={key => dictionary[key]} />) })
    cleanup.push(() => renderer.unmount())
    const select = renderer.root.findByType('select')
    expect(select.props.value).toBe('coding-plan')
    expect(renderer.root.findAllByType('input').some(node => node.props.type === 'password')).toBe(true)
    expect(renderer.root.findAllByType('input').some(node => node.props.placeholder?.includes('/mcp/'))).toBe(true)
    await act(async () => { select.props.onChange({ target: { value: 'api' } }) })
    expect(renderer.root.findAllByType('select')).toHaveLength(2)
    expect(renderer.root.findAllByType('input').some(node => node.props.placeholder === 'search-prime')).toBe(true)
    expect(JSON.stringify(renderer.toJSON())).toContain(dictionary.codingPlan) // Saved mode is still Coding Plan until Save.
    await act(async () => { renderer.root.findByType('form').props.onSubmit({ preventDefault() {} }) })
    expect(f.store.getSnapshot().scope.value?.billingMode).toBe('api')
  })
  it('disables key editing for literals and all writes for read-only settings', async () => {
    const f = fixture({}, true)
    f.external({ writable: false })
    let renderer!: ReactTestRenderer
    await act(async () => { renderer = create(<Card store={f.store} t={key => en[key]} />) })
    cleanup.push(() => renderer.unmount())
    expect(renderer.root.findAllByType('input').every(node => node.props.disabled)).toBe(true)
    expect(JSON.stringify(renderer.toJSON())).toContain(en.literalKey)
  })
  it.each([false, true])('loads the browser factory and saves with published scope compatibility: %s', async publishedScope => {
    const code = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
    let bundle: { apply: typeof apply, inject: string[] } | undefined
    const imports: string[] = []
    runInNewContext(code, { window: { __ModuleLoader__: { load: (definition: any) => {
      expect(definition.id).toBe('dsh-web-search-zai')
      bundle = definition.factory((id: string) => {
        imports.push(id)
        if (id === 'react') return React
        if (id === 'react/jsx-runtime') return jsxRuntime
        throw new Error(`Unexpected browser import: ${id}`)
      })
    } } } })
    expect(imports.every(id => id.startsWith('react'))).toBe(true)
    expect(bundle!.inject).toContain('settingsScope')
    const f = fixture()
    const definitions: Record<string, unknown>[] = []
    const effects: (() => void)[] = []
    const wireMutate = vi.fn(async (input: { ops: Parameters<SettingsScope['mutate']>[0], expectedRevision?: number }) => {
      await f.scope.mutate(input.ops, input.expectedRevision)
      return { result: { ok: true, value: { ns: 'web-search-zai' } } }
    })
    const acceptView = vi.fn()
    const ctx: ClientContext = {
      get: () => ({ api: { credentials: f.credentials, settings: { mutate: wireMutate } } }),
      settingsScope: {
        bind: () => publishedScope ? { getSnapshot: f.scope.getSnapshot, subscribe: f.scope.subscribe } : f.scope,
        describe: () => ({ ...f.mirror, acceptView }),
      },
      locale: { bind: () => key => en[key as keyof typeof en], register: vi.fn() },
      slots: { inject: (_slot, install) => install(), register: definition => { definitions.push(definition) } },
      effect: install => { const dispose = install(); if (typeof dispose === 'function') effects.push(dispose as () => void) },
      remote: { $on: () => () => {} },
      on: () => () => {},
    }
    bundle!.apply(ctx)
    expect(definitions[0]).toMatchObject({ name: 'settings.section', id: 'zai-web-search' })
    expect(definitions[1]).toMatchObject({ name: 'settings.zai.item', id: 'zai-config' })
    const injected = (definitions[1]!.inject as () => { store: CardStore })()
    injected.store.edit('billingMode', 'api')
    expect(await injected.store.save('')).toBe(true)
    if (publishedScope) {
      expect(wireMutate).toHaveBeenCalledWith({ ns: 'web-search-zai', ops: [{ op: 'set', path: ['billingMode'], value: 'api' }], expectedRevision: 1 })
      expect(acceptView).toHaveBeenCalledWith({ ns: 'web-search-zai' })
    } else expect(wireMutate).not.toHaveBeenCalled()
    for (const effect of effects) effect()
    expect(f.listeners.size).toBe(1) // Only the fixture's own store remains.
    const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
    expect(pkg.exports['./client']).toBe('./lib/client.js')
    expect(pkg.dsh.client.platform).toBe('web')
  })
})
