import { useState, useSyncExternalStore } from 'react'
import type { CSSProperties, ReactElement } from 'react'
import type { CardStore, Field } from './store.ts'
import type { MessageKey } from './locales.ts'

const column: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 'var(--dsw-spacing-3, 12px)' }
const hint: CSSProperties = { margin: 0, fontSize: 'var(--dsw-font-size-sm, 13px)', color: 'var(--dsw-alias-fg-secondary, #667085)' }
const input: CSSProperties = {
  padding: 'var(--dsw-spacing-2, 8px)', border: '1px solid var(--dsw-alias-border-primary, #d0d5dd)',
  borderRadius: 'var(--dsw-radius-md, 6px)', background: 'var(--dsw-alias-bg-primary, transparent)',
  color: 'inherit', font: 'inherit', width: '100%', boxSizing: 'border-box',
}
const button: CSSProperties = { ...input, width: 'auto', cursor: 'pointer' }

export interface CardProps { store: CardStore, t: (key: MessageKey) => string }

/** DSH supplies React and theme tokens; the form reads the host's shared settings mirror. */
export function Card({ store, t }: CardProps): ReactElement {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const [key, setKey] = useState('')
  const [keyRevision, setKeyRevision] = useState<number | undefined>()
  const readonly = state.scope.status !== 'ready' || !state.scope.writable || state.scope.mode !== 'host'
  const disabled = readonly || state.saving
  const value = (field: Field) => state.draft[field] ?? state.scope.value?.[field] ?? ''
  const mode = value('billingMode') || 'coding-plan'
  const savedMode = state.scope.value?.billingMode ?? 'coding-plan'
  const refChanged = Object.hasOwn(state.draft, 'apiKeyEnv')
  const stale = [state.draftRevision, keyRevision].some(revision => revision !== undefined && revision !== state.scope.revision)
  const clearKey = () => { setKey(''); setKeyRevision(undefined) }
  const field = (name: Field, placeholder: string) => (
    <label style={column}>
      <span>{t(name)}</span>
      <input style={input} value={value(name)} placeholder={placeholder} disabled={disabled}
        onChange={event => store.edit(name, event.target.value)} />
    </label>
  )
  return (
    <form style={{ ...column, maxWidth: 640 }} onSubmit={event => {
      event.preventDefault()
      void store.save(key, keyRevision).then(ok => { if (ok) clearKey() })
    }}>
      <p style={hint}>{t('description')}</p>
      <label style={column}>
        <span>{t('billingMode')}</span>
        <select style={input} value={mode} disabled={disabled} onChange={event => store.edit('billingMode', event.target.value)}>
          <option value="coding-plan">{t('codingPlan')}</option>
          <option value="api">{t('api')}</option>
        </select>
      </label>
      <p style={hint}>{t('activeMode')}: {t(savedMode === 'api' ? 'api' : 'codingPlan')}</p>
      <p style={hint}>{t('billingHint')}</p>
      <label style={column}>
        <span>{t('apiKey')} · <strong>{t(state.configured || state.literalKey ? 'configured' : 'missing')}</strong></span>
        <input style={input} type="password" autoComplete="new-password" value={key}
          disabled={disabled || !state.keyWritable || state.literalKey || refChanged}
          onChange={event => { setKey(event.target.value); setKeyRevision(keyRevision ?? state.scope.revision) }} />
      </label>
      <p style={hint}>{t('keyHint')}</p>
      {state.literalKey ? <p role="note" style={hint}>{t('literalKey')}</p> : null}
      <a href="https://z.ai/manage-apikey/apikey-list" target="_blank" rel="noreferrer">{t('getKey')}</a>
      <details>
        <summary style={{ cursor: 'pointer', marginBottom: 12 }}>{t('advanced')}</summary>
        <div style={column}>
          {field('apiKeyEnv', 'ZAI_API_KEY')}
          <p style={hint}>{t('refHint')}</p>
          {mode === 'coding-plan'
            ? field('mcpURL', 'https://api.z.ai/api/mcp/web_search_prime/mcp')
            : <>
                {field('baseURL', 'https://api.z.ai/api/paas/v4')}
                <p style={hint}>{t('baseHint')}</p>
                {field('searchEngine', 'search-prime')}
                <label style={column}>
                  <span>{t('searchRecency')}</span>
                  <select style={input} value={value('searchRecency')} disabled={disabled} onChange={event => store.edit('searchRecency', event.target.value)}>
                    <option value="">{t('inherited')}</option>
                    {(['day', 'week', 'month', 'year'] as const).map(period => <option key={period} value={period}>{t(period)}</option>)}
                  </select>
                </label>
              </>}
        </div>
      </details>
      {readonly ? <p role="status" style={hint}>{t('unavailable')}</p> : null}
      {stale && !state.saving ? <p role="status" style={hint}>{t('stale')}</p> : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button type="submit" disabled={disabled || stale} style={{ ...button, background: 'var(--dsw-alias-bg-brand, #2970ff)', color: '#fff' }}>{t(state.saving ? 'saving' : 'save')}</button>
        <button type="button" disabled={disabled || stale} style={button} onClick={() => { void store.reset().then(ok => { if (ok) clearKey() }) }}>{t('reset')}</button>
        <button type="button" disabled={state.saving} style={button} onClick={() => { store.discard(); clearKey() }}>{t('discard')}</button>
      </div>
      {state.message ? <p role="status" style={hint}>{t(state.message)}</p> : null}
      <p style={hint}>{t('storage')}</p>
    </form>
  )
}
