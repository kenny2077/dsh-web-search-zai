window.__ModuleLoader__.load({
	id: "dsh-web-search-zai",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/card.tsx
		const column = {
			display: "flex",
			flexDirection: "column",
			gap: "var(--dsw-spacing-3, 12px)"
		};
		const hint = {
			margin: 0,
			fontSize: "var(--dsw-font-size-sm, 13px)",
			color: "var(--dsw-alias-fg-secondary, #667085)"
		};
		const input = {
			padding: "var(--dsw-spacing-2, 8px)",
			border: "1px solid var(--dsw-alias-border-primary, #d0d5dd)",
			borderRadius: "var(--dsw-radius-md, 6px)",
			background: "var(--dsw-alias-bg-primary, transparent)",
			color: "inherit",
			font: "inherit",
			width: "100%",
			boxSizing: "border-box"
		};
		const button = {
			...input,
			width: "auto",
			cursor: "pointer"
		};
		/** DSH supplies React and theme tokens; the form reads the host's shared settings mirror. */
		function Card({ store, t }) {
			const state = (0, react.useSyncExternalStore)(store.subscribe, store.getSnapshot);
			const [key, setKey] = (0, react.useState)("");
			const [keyRevision, setKeyRevision] = (0, react.useState)();
			const readonly = state.scope.status !== "ready" || !state.scope.writable || state.scope.mode !== "host";
			const disabled = readonly || state.saving;
			const value = (field) => state.draft[field] ?? state.scope.value?.[field] ?? "";
			const mode = value("billingMode") || "coding-plan";
			const savedMode = state.scope.value?.billingMode ?? "coding-plan";
			const refChanged = Object.hasOwn(state.draft, "apiKeyEnv");
			const stale = [state.draftRevision, keyRevision].some((revision) => revision !== void 0 && revision !== state.scope.revision);
			const clearKey = () => {
				setKey("");
				setKeyRevision(void 0);
			};
			const field = (name, placeholder) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				style: column,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t(name) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					style: input,
					value: value(name),
					placeholder,
					disabled,
					onChange: (event) => store.edit(name, event.target.value)
				})]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
				style: {
					...column,
					maxWidth: 640
				},
				onSubmit: (event) => {
					event.preventDefault();
					store.save(key, keyRevision).then((ok) => {
						if (ok) clearKey();
					});
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: hint,
						children: t("description")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						style: column,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("billingMode") }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
							style: input,
							value: mode,
							disabled,
							onChange: (event) => store.edit("billingMode", event.target.value),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: "coding-plan",
								children: t("codingPlan")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: "api",
								children: t("api")
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						style: hint,
						children: [
							t("activeMode"),
							": ",
							t(savedMode === "api" ? "api" : "codingPlan")
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: hint,
						children: t("billingHint")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						style: column,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
							t("apiKey"),
							" · ",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: t(state.configured || state.literalKey ? "configured" : "missing") })
						] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							style: input,
							type: "password",
							autoComplete: "new-password",
							value: key,
							disabled: disabled || !state.keyWritable || state.literalKey || refChanged,
							onChange: (event) => {
								setKey(event.target.value);
								setKeyRevision(keyRevision ?? state.scope.revision);
							}
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: hint,
						children: t("keyHint")
					}),
					state.literalKey ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						role: "note",
						style: hint,
						children: t("literalKey")
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
						href: "https://z.ai/manage-apikey/apikey-list",
						target: "_blank",
						rel: "noreferrer",
						children: t("getKey")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", {
						style: {
							cursor: "pointer",
							marginBottom: 12
						},
						children: t("advanced")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: column,
						children: [
							field("apiKeyEnv", "ZAI_API_KEY"),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								style: hint,
								children: t("refHint")
							}),
							mode === "coding-plan" ? field("mcpURL", "https://api.z.ai/api/mcp/web_search_prime/mcp") : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								field("baseURL", "https://api.z.ai/api/paas/v4"),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									style: hint,
									children: t("baseHint")
								}),
								field("searchEngine", "search-prime"),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									style: column,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("searchRecency") }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
										style: input,
										value: value("searchRecency"),
										disabled,
										onChange: (event) => store.edit("searchRecency", event.target.value),
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "",
											children: t("inherited")
										}), [
											"day",
											"week",
											"month",
											"year"
										].map((period) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: period,
											children: t(period)
										}, period))]
									})]
								})
							] })
						]
					})] }),
					readonly ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						role: "status",
						style: hint,
						children: t("unavailable")
					}) : null,
					stale && !state.saving ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						role: "status",
						style: hint,
						children: t("stale")
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							flexWrap: "wrap",
							gap: 8
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "submit",
								disabled: disabled || stale,
								style: {
									...button,
									background: "var(--dsw-alias-bg-brand, #2970ff)",
									color: "#fff"
								},
								children: t(state.saving ? "saving" : "save")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: disabled || stale,
								style: button,
								onClick: () => {
									store.reset().then((ok) => {
										if (ok) clearKey();
									});
								},
								children: t("reset")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: state.saving,
								style: button,
								onClick: () => {
									store.discard();
									clearKey();
								},
								children: t("discard")
							})
						]
					}),
					state.message ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						role: "status",
						style: hint,
						children: t(state.message)
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: hint,
						children: t("storage")
					})
				]
			});
		}
		//#endregion
		//#region src/client/store.ts
		/** Structural host contracts keep the browser bundle free of host runtime imports. */
		const NAMESPACE = "web-search-zai";
		const FIELDS = [
			"billingMode",
			"apiKeyEnv",
			"mcpURL",
			"baseURL",
			"searchEngine",
			"searchRecency"
		];
		/** The card stages only non-secret fields. A typed key lives in the form until Save. */
		var CardStore = class {
			scope;
			mirror;
			credentials;
			state;
			listeners = /* @__PURE__ */ new Set();
			cleanups;
			disposed = false;
			credentialGeneration = 0;
			constructor(scope, mirror, credentials) {
				this.scope = scope;
				this.mirror = mirror;
				this.credentials = credentials;
				this.state = {
					scope: scope.getSnapshot(),
					draft: {},
					draftRevision: void 0,
					saving: false,
					configured: false,
					keyWritable: false,
					literalKey: false,
					message: void 0
				};
				this.cleanups = [scope.subscribe(() => this.refresh()), mirror.subscribe(() => this.refresh())];
				this.refresh();
			}
			getSnapshot = () => this.state;
			subscribe = (listener) => {
				this.listeners.add(listener);
				return () => {
					this.listeners.delete(listener);
				};
			};
			update(patch) {
				if (this.disposed) return;
				this.state = {
					...this.state,
					...patch
				};
				for (const listener of this.listeners) listener();
			}
			refresh() {
				const previousRef = this.keyRef();
				const scope = this.scope.getSnapshot();
				const descriptor = this.mirror.getSnapshot().view?.namespaces.find((item) => item.ns === NAMESPACE);
				this.update({
					scope,
					literalKey: descriptor?.secrets?.some((secret) => secret.path.length === 1 && secret.path[0] === "apiKey" && secret.set) === true
				});
				if (previousRef !== this.keyRef() || this.credentialGeneration === 0) this.refreshCredential();
			}
			keyRef() {
				return this.state.scope.value?.apiKeyEnv || "ZAI_API_KEY";
			}
			async refreshCredential() {
				const generation = ++this.credentialGeneration;
				const ref = this.keyRef();
				this.update({ keyWritable: false });
				try {
					const response = await this.credentials?.describe({ refs: [ref] });
					if (generation !== this.credentialGeneration) return;
					const info = response?.result?.ok ? response.result.value?.credentials?.[ref] : void 0;
					this.update({
						configured: info?.configured === true,
						keyWritable: info?.writable === true
					});
				} catch {
					if (generation === this.credentialGeneration) this.update({ keyWritable: false });
				}
			}
			edit(field, value) {
				if (this.state.saving) return;
				this.update({
					draft: {
						...this.state.draft,
						[field]: value
					},
					draftRevision: this.state.draftRevision ?? this.state.scope.revision,
					message: void 0
				});
			}
			discard() {
				this.update({
					draft: {},
					draftRevision: void 0,
					message: void 0
				});
			}
			ready(revision) {
				const current = this.scope.getSnapshot();
				if (this.disposed || this.state.saving || !current.writable || current.mode !== "host" || current.status !== "ready") return false;
				if (revision === void 0 || revision !== current.revision) {
					this.update({ message: "stale" });
					return false;
				}
				return true;
			}
			async commit(ops, revision) {
				try {
					await this.scope.mutate(ops, revision);
					const snapshot = this.scope.getSnapshot();
					const user = snapshot.user;
					return snapshot.status === "ready" && snapshot.mode === "host" && ops.every((op) => op.op === "unset" ? !Object.hasOwn(user ?? {}, op.path[0]) : Object.hasOwn(user ?? {}, op.path[0]) && user?.[op.path[0]] === op.value);
				} catch {
					return false;
				}
			}
			async save(key, keyRevision) {
				const revision = this.state.draftRevision ?? keyRevision ?? this.state.scope.revision;
				if (key.trim() && keyRevision !== void 0 && keyRevision !== this.scope.getSnapshot().revision) {
					this.update({ message: "stale" });
					return false;
				}
				if (!this.ready(revision)) return false;
				const ops = [];
				for (const field of FIELDS) {
					if (!Object.hasOwn(this.state.draft, field)) continue;
					const value = this.state.draft[field].trim();
					if (value && !validField(field, value)) {
						this.update({ message: "invalid" });
						return false;
					}
					ops.push(value ? {
						op: "set",
						path: [field],
						value
					} : {
						op: "unset",
						path: [field]
					});
				}
				this.update({
					saving: true,
					message: void 0
				});
				let settingsSaved = false;
				try {
					if (ops.length) {
						if (!await this.commit(ops, revision)) {
							this.update({ message: "settingsFailed" });
							return false;
						}
						settingsSaved = true;
						this.update({
							draft: {},
							draftRevision: void 0
						});
					}
					if (key.trim()) {
						const keyRef = this.keyRef();
						const keyScopeRevision = this.scope.getSnapshot().revision;
						await this.refreshCredential();
						if (this.disposed) return false;
						if (!this.state.keyWritable || this.state.literalKey || !this.credentials || keyRef !== this.keyRef() || keyScopeRevision !== this.scope.getSnapshot().revision) {
							this.update({ message: settingsSaved ? "partialSave" : "keyFailed" });
							return false;
						}
						try {
							if (!(await this.credentials.set({
								ref: keyRef,
								value: key.trim()
							})).result?.ok) throw new Error("Credential rejected");
						} catch {
							this.update({ message: settingsSaved ? "partialSave" : "keyFailed" });
							return false;
						}
						await this.refreshCredential();
					}
					this.update({ message: "saved" });
					return true;
				} finally {
					this.update({ saving: false });
				}
			}
			async reset() {
				const revision = this.state.draftRevision ?? this.state.scope.revision;
				if (!this.ready(revision)) return false;
				this.update({
					saving: true,
					message: void 0
				});
				try {
					const ok = await this.commit(FIELDS.map((field) => ({
						op: "unset",
						path: [field]
					})), revision);
					if (ok) this.update({
						draft: {},
						draftRevision: void 0,
						message: "resetDone"
					});
					else this.update({ message: "settingsFailed" });
					return ok;
				} finally {
					this.update({ saving: false });
				}
			}
			dispose() {
				this.disposed = true;
				this.credentialGeneration++;
				for (const cleanup of this.cleanups) cleanup();
				this.listeners.clear();
			}
		};
		function validField(field, value) {
			if (field === "billingMode") return value === "coding-plan" || value === "api";
			if (field === "searchRecency") return [
				"day",
				"week",
				"month",
				"year"
			].includes(value);
			if (field === "apiKeyEnv") return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);
			if (field === "baseURL" || field === "mcpURL") try {
				const url = new URL(value);
				return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password && !url.hash;
			} catch {
				return false;
			}
			return true;
		}
		//#endregion
		//#region src/client/locales.ts
		const en = {
			title: "Web Search (Z.ai)",
			description: "Use your Z.ai key for web search. Changes apply to the next search.",
			billingMode: "Billing mode",
			codingPlan: "Coding Plan — subscription MCP quota",
			api: "API — API balance",
			billingHint: "Coding Plan requires an eligible subscription. Search never switches to paid API automatically.",
			activeMode: "Saved mode",
			apiKey: "API key",
			keyHint: "Leave blank to keep the current key. Replacing this shared key also affects chat.",
			configured: "Configured",
			missing: "Not configured",
			literalKey: "A literal apiKey in your configuration overrides the managed key. Remove that literal to manage the key here.",
			getKey: "Manage Z.ai API keys ↗",
			advanced: "Advanced settings",
			apiKeyEnv: "Credential reference",
			refHint: "Default: ZAI_API_KEY. Save a changed reference before entering its key.",
			mcpURL: "Coding Plan MCP endpoint",
			baseURL: "REST API base URL",
			baseHint: "An inherited endpoint may come from configuration or ZAI_SEARCH_BASE_URL.",
			searchEngine: "API search engine",
			searchRecency: "API recency filter",
			inherited: "Inherited / default",
			day: "Past day",
			week: "Past week",
			month: "Past month",
			year: "Past year",
			save: "Save",
			saving: "Saving…",
			reset: "Reset search settings",
			discard: "Discard edits",
			storage: "The key is stored by DSH credentials. Other fields use DSH settings. Reset restores inherited search settings and keeps your shared key.",
			unavailable: "Settings are loading, unavailable, or read-only in this connection.",
			stale: "Settings changed while you were editing. Discard edits and try again.",
			saved: "Saved.",
			settingsFailed: "Search settings were not saved. Review the current values and retry.",
			keyFailed: "The key was not saved. Check credential storage access and retry.",
			partialSave: "Search settings were saved, but the key was not saved. Retry the key separately.",
			resetDone: "Search overrides cleared. Your shared key was kept.",
			invalid: "Check the endpoint, credential reference, or selected value."
		};
		const zh = {
			title: "网页搜索（Z.ai）",
			description: "使用 Z.ai 密钥进行网页搜索。更改将在下一次搜索时生效。",
			billingMode: "计费模式",
			codingPlan: "Coding Plan — 套餐 MCP 额度",
			api: "API — API 账户余额",
			billingHint: "Coding Plan 需要有效的订阅。搜索不会自动切换到付费 API。",
			activeMode: "已保存的模式",
			apiKey: "API 密钥",
			keyHint: "留空保留当前密钥。替换此共享密钥也会影响聊天。",
			configured: "已配置",
			missing: "未配置",
			literalKey: "配置中的 apiKey 明文值优先于凭据服务中的密钥。请移除该明文值后在此管理密钥。",
			getKey: "管理 Z.ai API 密钥 ↗",
			advanced: "高级设置",
			apiKeyEnv: "凭据引用名称",
			refHint: "默认：ZAI_API_KEY。更改引用名称后，请先保存，再输入对应密钥。",
			mcpURL: "Coding Plan MCP 地址",
			baseURL: "REST API 基础地址",
			baseHint: "继承的地址可能来自配置或 ZAI_SEARCH_BASE_URL。",
			searchEngine: "API 搜索引擎",
			searchRecency: "API 时间范围",
			inherited: "继承 / 默认",
			day: "最近一天",
			week: "最近一周",
			month: "最近一个月",
			year: "最近一年",
			save: "保存",
			saving: "保存中…",
			reset: "重置搜索设置",
			discard: "放弃更改",
			storage: "密钥由 DSH 凭据服务保存，其他字段使用 DSH 设置。重置会恢复继承的搜索设置，并保留共享密钥。",
			unavailable: "设置正在加载、不可用，或当前连接仅允许读取。",
			stale: "编辑期间设置已更改。请放弃更改后重试。",
			saved: "已保存。",
			settingsFailed: "搜索设置未保存。请检查当前值后重试。",
			keyFailed: "密钥未保存。请检查凭据存储权限后重试。",
			partialSave: "搜索设置已保存，但密钥未保存。请单独重试保存密钥。",
			resetDone: "已清除搜索覆盖值，保留了共享密钥。",
			invalid: "请检查地址、凭据引用名称或所选值。"
		};
		//#endregion
		//#region src/client/index.tsx
		const inject = [
			"slots",
			"locale",
			"connection",
			"remote",
			"settingsScope"
		];
		const locale = "settings.plugins.zai";
		const itemSlot = "settings.zai.item";
		function apply(ctx) {
			const scope = ctx.settingsScope.bind({ namespace: NAMESPACE });
			const mirror = ctx.settingsScope.describe();
			const api = ctx.get("connection")?.api;
			const store = new CardStore({
				getSnapshot: () => scope.getSnapshot(),
				subscribe: (listener) => scope.subscribe(listener),
				mutate: async (ops, expectedRevision) => {
					if (scope.mutate) return scope.mutate(ops, expectedRevision);
					if (!api?.settings || !mirror.acceptView) throw new Error("Settings writes unavailable");
					const answer = await api.settings.mutate({
						ns: NAMESPACE,
						ops,
						...expectedRevision === void 0 ? {} : { expectedRevision }
					});
					if (!answer.result.ok) throw new Error("Settings write rejected");
					mirror.acceptView(answer.result.value);
				}
			}, mirror, api?.credentials);
			const t = ctx.locale.bind(locale);
			ctx.effect(() => () => store.dispose(), "web-search-zai: settings subscriptions");
			ctx.effect(() => ctx.locale.register(locale, {
				en,
				zh
			}), "web-search-zai: dictionaries");
			ctx.effect(() => ctx.remote.$on("credentials/reference-updated", (ref) => {
				if (ref === store.keyRef()) store.refreshCredential();
			}), "web-search-zai: credential changes");
			ctx.effect(() => ctx.on("connection/reset", () => {
				store.refreshCredential();
			}), "web-search-zai: reconnect");
			const Section = ({ renderSlot }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: renderSlot(itemSlot) });
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "zai-web-search",
				order: 21,
				label: () => t("title"),
				locale,
				children: { [itemSlot]: {
					kind: "list",
					scope: "root"
				} }
			}, Section));
			ctx.slots.inject(itemSlot, () => ctx.slots.register({
				name: itemSlot,
				id: "zai-config",
				order: 0,
				locale,
				inject: () => ({
					store,
					t
				})
			}, Card));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map