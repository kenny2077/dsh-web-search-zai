/**
 * Browser-side DSH plugin entry point.
 *
 * Loaded by the DSH shell's `__ModuleLoader__` factory. Binds the settings
 * scope, registers locale dictionaries, injects the settings card into the
 * `settings.section` slot, and relays credential-update events to the store.
 *
 * @module dsh-web-search-zai/client
 */

import type { ReactNode } from 'react'
import { Card } from './card.tsx'
import { CardStore, NAMESPACE } from './store.ts'
import type { CredentialsApi, Mirror, Op, SettingsScope } from './store.ts'
import { en, zh } from './locales.ts'

export interface ClientContext {
  get(service: 'connection'): { api: {
    credentials: CredentialsApi
    settings?: { mutate(input: { ns: string, ops: readonly Op[], expectedRevision?: number }): Promise<{ result: { ok: boolean, value?: unknown } }> }
  } } | undefined
  settingsScope: {
    bind(spec: { namespace: string }): Omit<SettingsScope, 'mutate'> & Partial<Pick<SettingsScope, 'mutate'>>
    describe(): Mirror & { acceptView?(view: unknown): void }
  }
  locale: { bind(namespace: string): (key: string) => string, register(namespace: string, dictionaries: unknown): unknown }
  slots: { inject(slot: string, factory: () => unknown): unknown, register(definition: Record<string, unknown>, component: unknown): unknown }
  remote: { $on(event: string, handler: (ref: string) => void): unknown }
  on(event: string, handler: () => void): unknown
  effect(install: () => unknown, label: string): unknown
}

export const inject = ['slots', 'locale', 'connection', 'remote', 'settingsScope']
const locale = 'settings.plugins.zai'
const itemSlot = 'settings.zai.item'

export function apply(ctx: ClientContext): void {
  const scope = ctx.settingsScope.bind({ namespace: NAMESPACE })
  const mirror = ctx.settingsScope.describe()
  const api = ctx.get('connection')?.api
  const store = new CardStore({
    getSnapshot: () => scope.getSnapshot(),
    subscribe: listener => scope.subscribe(listener),
    mutate: async (ops, expectedRevision) => {
      if (scope.mutate) return scope.mutate(ops, expectedRevision)
      // Published DSH 0.1.1-rc.2 scopes expose only set/unset. Use its atomic
      // wire operation for staged edits, folding the answer into the same mirror.
      if (!api?.settings || !mirror.acceptView) throw new Error('Settings writes unavailable')
      const answer = await api.settings.mutate({ ns: NAMESPACE, ops, ...expectedRevision === undefined ? {} : { expectedRevision } })
      if (!answer.result.ok) throw new Error('Settings write rejected')
      mirror.acceptView(answer.result.value)
    },
  }, mirror, api?.credentials)
  const t = ctx.locale.bind(locale)
  ctx.effect(() => () => store.dispose(), 'web-search-zai: settings subscriptions')
  ctx.effect(() => ctx.locale.register(locale, { en, zh }), 'web-search-zai: dictionaries')
  ctx.effect(() => ctx.remote.$on('credentials/reference-updated', ref => {
    if (ref === store.keyRef()) void store.refreshCredential()
  }), 'web-search-zai: credential changes')
  ctx.effect(() => ctx.on('connection/reset', () => { void store.refreshCredential() }), 'web-search-zai: reconnect')
  const Section = ({ renderSlot }: { renderSlot: (slot: string) => ReactNode }) => <div>{renderSlot(itemSlot)}</div>
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section', id: 'zai-web-search', order: 21, label: () => t('title'), locale,
    children: { [itemSlot]: { kind: 'list', scope: 'root' } },
  }, Section))
  ctx.slots.inject(itemSlot, () => ctx.slots.register({
    name: itemSlot, id: 'zai-config', order: 0, locale, inject: () => ({ store, t }),
  }, Card))
}
