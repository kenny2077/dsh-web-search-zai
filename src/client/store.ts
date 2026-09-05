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
export const NAMESPACE = 'web-search-zai'
export const FIELDS = ['billingMode', 'apiKeyEnv', 'mcpURL', 'baseURL', 'searchEngine', 'searchRecency'] as const
export type Field = typeof FIELDS[number]
export type Values = Partial<Record<Field, string>>
export type Op = { op: 'set', path: string[], value: string } | { op: 'unset', path: string[] }

export interface ScopeSnapshot {
  status: 'loading' | 'ready' | 'unavailable'
  value: Values | undefined
  user: unknown
  revision: number | undefined
  writable: boolean
  mode: 'host' | 'memory'
}
export interface SettingsScope {
  getSnapshot(): ScopeSnapshot
  subscribe(listener: () => void): () => void
  mutate(ops: readonly Op[], expectedRevision?: number): Promise<void>
}
export interface Mirror {
  getSnapshot(): { view?: { namespaces: { ns: string, secrets?: { path: string[], set: boolean }[] }[] } }
  subscribe(listener: () => void): () => void
}
export interface CredentialsApi {
  describe(input: { refs: string[] }): Promise<{ result?: { ok?: boolean, value?: { credentials?: Record<string, { configured?: boolean, writable?: boolean }> } } }>
  set(input: { ref: string, value: string }): Promise<{ result?: { ok?: boolean } }>
}
export type Message = 'saved' | 'settingsFailed' | 'keyFailed' | 'partialSave' | 'resetDone' | 'stale' | 'invalid'
export interface CardState {
  scope: ScopeSnapshot
  draft: Values
  draftRevision: number | undefined
  saving: boolean
  configured: boolean
  keyWritable: boolean
  literalKey: boolean
  message: Message | undefined
}

/**
 * Reactive state store for the settings card.
 *
 * Bridges the DSH settings scope and credentials API into a single
 * subscribe/getSnapshot contract that React can consume via
 * `useSyncExternalStore`. Edits are staged locally until {@link save}
 * commits them atomically with revision checks.
 */
export class CardStore {
  private state: CardState
  private readonly listeners = new Set<() => void>()
  private readonly cleanups: (() => void)[]
  private disposed = false
  private credentialGeneration = 0

  constructor(private readonly scope: SettingsScope, private readonly mirror: Mirror, private readonly credentials: CredentialsApi | undefined) {
    this.state = {
      scope: scope.getSnapshot(), draft: {}, draftRevision: undefined, saving: false,
      configured: false, keyWritable: false, literalKey: false, message: undefined,
    }
    this.cleanups = [scope.subscribe(() => this.refresh()), mirror.subscribe(() => this.refresh())]
    this.refresh()
  }

  getSnapshot = (): CardState => this.state
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }
  private update(patch: Partial<CardState>): void {
    if (this.disposed) return
    this.state = { ...this.state, ...patch }
    for (const listener of this.listeners) listener()
  }
  private refresh(): void {
    const previousRef = this.keyRef()
    const scope = this.scope.getSnapshot()
    const descriptor = this.mirror.getSnapshot().view?.namespaces.find(item => item.ns === NAMESPACE)
    this.update({ scope, literalKey: descriptor?.secrets?.some(secret => secret.path.length === 1 && secret.path[0] === 'apiKey' && secret.set) === true })
    if (previousRef !== this.keyRef() || this.credentialGeneration === 0) void this.refreshCredential()
  }
  keyRef(): string { return this.state.scope.value?.apiKeyEnv || 'ZAI_API_KEY' }
  /** Re-query the credentials API for the current key reference's status. */
  async refreshCredential(): Promise<void> {
    const generation = ++this.credentialGeneration
    const ref = this.keyRef()
    this.update({ keyWritable: false })
    try {
      const response = await this.credentials?.describe({ refs: [ref] })
      if (generation !== this.credentialGeneration) return
      const info = response?.result?.ok ? response.result.value?.credentials?.[ref] : undefined
      this.update({ configured: info?.configured === true, keyWritable: info?.writable === true })
    } catch {
      if (generation === this.credentialGeneration) this.update({ keyWritable: false })
    }
  }
  /** Stage a field edit locally. Has no effect while a save is in progress. */
  edit(field: Field, value: string): void {
    if (this.state.saving) return
    this.update({
      draft: { ...this.state.draft, [field]: value },
      draftRevision: this.state.draftRevision ?? this.state.scope.revision,
      message: undefined,
    })
  }
  discard(): void { this.update({ draft: {}, draftRevision: undefined, message: undefined }) }

  private ready(revision: number | undefined): boolean {
    const current = this.scope.getSnapshot()
    if (this.disposed || this.state.saving || !current.writable || current.mode !== 'host' || current.status !== 'ready') return false
    if (revision === undefined || revision !== current.revision) { this.update({ message: 'stale' }); return false }
    return true
  }
  private async commit(ops: Op[], revision: number): Promise<boolean> {
    try {
      await this.scope.mutate(ops, revision)
      // Scope v1 recovers rejected writes without throwing. Check the committed user layer.
      const snapshot = this.scope.getSnapshot()
      const user = snapshot.user as Record<string, unknown> | undefined
      return snapshot.status === 'ready' && snapshot.mode === 'host' && ops.every(op => op.op === 'unset'
        ? !Object.hasOwn(user ?? {}, op.path[0]!)
        : Object.hasOwn(user ?? {}, op.path[0]!) && user?.[op.path[0]!] === op.value)
    } catch { return false }
  }
  /**
   * Commit staged edits and an optional key to the host.
   *
   * Settings fields are written first; if that succeeds and a non-empty key
   * was provided, the key is written through the credentials API. A failed
   * key write after a successful settings save is reported as `partialSave`.
   *
   * @returns `true` when all writes succeeded.
   */
  async save(key: string, keyRevision?: number): Promise<boolean> {
    const revision = this.state.draftRevision ?? keyRevision ?? this.state.scope.revision
    if (key.trim() && keyRevision !== undefined && keyRevision !== this.scope.getSnapshot().revision) {
      this.update({ message: 'stale' }); return false
    }
    if (!this.ready(revision)) return false
    const ops: Op[] = []
    for (const field of FIELDS) {
      if (!Object.hasOwn(this.state.draft, field)) continue
      const value = this.state.draft[field]!.trim()
      if (value && !validField(field, value)) { this.update({ message: 'invalid' }); return false }
      ops.push(value ? { op: 'set', path: [field], value } : { op: 'unset', path: [field] })
    }
    this.update({ saving: true, message: undefined })
    let settingsSaved = false
    try {
      if (ops.length) {
        if (!await this.commit(ops, revision!)) { this.update({ message: 'settingsFailed' }); return false }
        settingsSaved = true
        this.update({ draft: {}, draftRevision: undefined })
      }
      if (key.trim()) {
        const keyRef = this.keyRef()
        const keyScopeRevision = this.scope.getSnapshot().revision
        await this.refreshCredential()
        if (this.disposed) return false
        if (!this.state.keyWritable || this.state.literalKey || !this.credentials
          || keyRef !== this.keyRef() || keyScopeRevision !== this.scope.getSnapshot().revision) {
          this.update({ message: settingsSaved ? 'partialSave' : 'keyFailed' }); return false
        }
        try {
          const answer = await this.credentials.set({ ref: keyRef, value: key.trim() })
          if (!answer.result?.ok) throw new Error('Credential rejected')
        } catch { this.update({ message: settingsSaved ? 'partialSave' : 'keyFailed' }); return false }
        await this.refreshCredential()
      }
      this.update({ message: 'saved' })
      return true
    } finally { this.update({ saving: false }) }
  }
  /** Clear all non-secret user overrides, restoring inherited values. Keeps the shared key. */
  async reset(): Promise<boolean> {
    const revision = this.state.draftRevision ?? this.state.scope.revision
    if (!this.ready(revision)) return false
    this.update({ saving: true, message: undefined })
    try {
      const ok = await this.commit(FIELDS.map(field => ({ op: 'unset', path: [field] })), revision!)
      if (ok) this.update({ draft: {}, draftRevision: undefined, message: 'resetDone' })
      else this.update({ message: 'settingsFailed' })
      return ok
    } finally { this.update({ saving: false }) }
  }
  dispose(): void {
    this.disposed = true
    this.credentialGeneration++
    for (const cleanup of this.cleanups) cleanup()
    this.listeners.clear()
  }
}

function validField(field: Field, value: string): boolean {
  if (field === 'billingMode') return value === 'coding-plan' || value === 'api'
  if (field === 'searchRecency') return ['day', 'week', 'month', 'year'].includes(value)
  if (field === 'apiKeyEnv') return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value)
  if (field === 'baseURL' || field === 'mcpURL') {
    try {
      const url = new URL(value)
      return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && !url.hash
    } catch { return false }
  }
  return true
}
