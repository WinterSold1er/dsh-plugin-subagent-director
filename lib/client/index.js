window.__ModuleLoader__.load({
	id: "dsh-plugin-subagent-director",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_runtime_client = require("@deepseek-ai/dsh-client-runtime/client");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/bind.ts
		/**
		* uSES bridge: turns any bare observable snapshot source into a selector hook.
		*
		* DSH rc8 removed the `@deepseek-ai/dsh-client-web-react` package (its client
		* store-binding helpers were folded into the core slot kit). This is a local
		* copy of the same `bindSnapshotSelector` contract, implemented against the
		* `react` seed provided by the DSH client module table, so the plugin keeps
		* working on rc8+ without an extra runtime dependency.
		*/
		/**
		* Bind a bare observable source (subscribe/getSnapshot) to a selector hook.
		* The selector is applied to the snapshot on every render; identity stores can
		* simply pass `(s) => s`.
		*/
		function bindSnapshotSelector(store) {
			const subscribe = (listener) => store.subscribe(listener);
			const getSnapshot = () => store.getSnapshot();
			return function useSelector(selector) {
				const select = selector ?? ((state) => state);
				return (0, react.useSyncExternalStore)(subscribe, () => select(getSnapshot()));
			};
		}
		//#endregion
		//#region src/client/locales.ts
		/** English dictionary ($subagentDirector). */
		const en = {
			"nav": "Subagent Director",
			"sectionIntro": "Choose the LLM provider and model each subagent uses, and define role templates that bind a model and persona to a delegation.",
			"defaultsHeading": "Default model",
			"defaultsHint": "Used when a call or role does not name a provider/model.",
			"defaultProvider": "Provider",
			"defaultModel": "Model",
			"defaultReasoningEffort": "Reasoning effort",
			"restoreDefaults": "Restore defaults",
			"provider": "Provider",
			"model": "Model",
			"reasoningEffort": "Reasoning effort",
			"persona": "Persona",
			"rolesHeading": "Role templates",
			"rolesHint": "A role binds delegation guidance, a persona, and optionally a provider/model to a subagent.",
			"addRole": "Add role",
			"emptyRoles": "No role templates yet. Add one to start planning subagent responsibilities.",
			"roleId": "Role id",
			"roleDisplayName": "Display name",
			"roleDescription": "Delegation guidance",
			"rolePersona": "Persona",
			"setDefaultRole": "Set as default",
			"defaultRoleBadge": "Default",
			"deleteRole": "Delete",
			"confirmDeleteRole": "Delete role “{id}”? Roles referenced by defaultRole will fall back to the plugin default.",
			"removeRoleDone": "Role removed",
			"addedRole": "Role added",
			"roleUpdated": "Role updated",
			"conflict": "The settings changed on the server. Reloading your edits — please review and retry.",
			"rejected": "The change was rejected by the settings provider.",
			"fatal": "Could not save: {message}",
			"loadError": "Could not load preference settings.",
			"readonly": "Settings are read-only in this deployment.",
			"save": "Save",
			"cancel": "Cancel",
			"edit": "Edit",
			"retry": "Retry",
			"fallbackOnInvalid": "Fall back to the parent agent when a role-bound model is invalid",
			"roleIdPlaceholder": "e.g. code-reviewer",
			"displayNamePlaceholder": "e.g. Code Reviewer",
			"descriptionPlaceholder": "When to delegate to this role and what it should do…",
			"personaPlaceholder": "Optional behavior/identity text injected into the subagent…",
			"modelOptional": "Save the card to apply changes",
			"providerMissing": "No provider selected",
			"toolFilter": "Tool set",
			"toolFilterHint": "Restrict the subagent to these tools. Leave empty to inherit the parent's full tool set.",
			"toolFilterNone": "Inherit parent tools (no restriction)",
			"toolFilterEmpty": "No tools available",
			"toolFilterSearch": "Search tools…",
			"toolFilterSelectAll": "Select all",
			"toolFilterDeselectAll": "Deselect all",
			"toolFilterCount": "Selected {count} / {total}",
			"toolFilterExpand": "Expand",
			"toolFilterCollapse": "Collapse",
			"toolFilterNoMatch": "No tools match the search.",
			"restoreDone": "Defaults restored",
			"invalidRoleId": "Role id must be kebab-case (lowercase letters, digits, single hyphens).",
			"bridgeUnavailable": "The Subagent Director settings bridge is not available on this server. Please update/restart the web application so it installs the /subagent-director channel.",
			"modelRanOn": "Subagent ran on",
			"modelNotRecorded": "Subagent model not recorded yet",
			"modelQueryFailed": "Subagent model unavailable",
			"modelRanOnTitle": "Model route: {model}",
			"closeContinuable": "Release subagent",
			"closeContinuableTitle": "Release this continuable subagent (free its resident handle)",
			"closingContinuable": "Releasing…",
			"closedSubagent": "Released",
			"confirmCloseContinuable": "Release continuable subagent “{id}”? It will stop being resident; you can no longer continue it with send_message.",
			"closeFailed": "Release failed: {message}",
			"enforcementHeading": "Orchestrate guard strictness",
			"enforcementHint": "strict: both sticky and per-turn orchestration are enforced at the tool level (write/execute tools blocked); lenient: only the sticky projection is tool-enforced, per-turn stays prompt-only (stated honestly).",
			"enforcementStrict": "Strict",
			"enforcementLenient": "Lenient",
			"enforcementStrictDesc": "Enforced for sticky and per-turn (tool-level block)",
			"enforcementLenientDesc": "Sticky-only enforced (per-turn prompt-only)"
		};
		/** Chinese dictionary. */
		const zh = {
			"nav": "子代理导演",
			"sectionIntro": "为每个子代理选择 LLM 供应商与模型，并以角色模板把模型与 persona 绑定到每次委派。",
			"defaultsHeading": "默认模型",
			"defaultsHint": "当某次调用或角色未指定供应商/模型时使用。",
			"defaultProvider": "供应商",
			"defaultModel": "模型",
			"defaultReasoningEffort": "推理强度",
			"restoreDefaults": "恢复默认",
			"provider": "供应商",
			"model": "模型",
			"reasoningEffort": "推理强度",
			"persona": "人设",
			"rolesHeading": "角色模板",
			"rolesHint": "角色把委派指引、persona 与可选的供应商/模型绑定到子代理。",
			"addRole": "添加角色",
			"emptyRoles": "还没有角色模板。添加一个以开始规划子代理职责。",
			"roleId": "角色 id",
			"roleDisplayName": "显示名称",
			"roleDescription": "委派指引",
			"rolePersona": "人设",
			"setDefaultRole": "设为默认",
			"defaultRoleBadge": "默认",
			"deleteRole": "删除",
			"confirmDeleteRole": "删除角色“{id}”？若 defaultRole 引用了它，将回退到插件默认值。",
			"removeRoleDone": "角色已删除",
			"addedRole": "角色已添加",
			"roleUpdated": "角色已更新",
			"conflict": "服务端设置已变更。已重新加载你的编辑——请复核并重试。",
			"rejected": "更改被设置提供方拒绝。",
			"fatal": "无法保存：{message}",
			"loadError": "无法加载偏好设置。",
			"readonly": "当前部署中设置为只读。",
			"save": "保存",
			"cancel": "取消",
			"edit": "编辑",
			"retry": "重试",
			"fallbackOnInvalid": "当角色绑定的模型无效时回退到父代理",
			"roleIdPlaceholder": "例如 code-reviewer",
			"displayNamePlaceholder": "例如 代码审查员",
			"descriptionPlaceholder": "何时委派给此角色、让其做什么……",
			"personaPlaceholder": "注入子代理的可选行为/身份文案……",
			"modelOptional": "保存卡片以应用更改",
			"providerMissing": "未选择供应商",
			"toolFilter": "工具集",
			"toolFilterHint": "将子代理限制为这些工具。留空则继承父代理的完整工具集。",
			"toolFilterNone": "继承父代理工具（不限制）",
			"toolFilterEmpty": "无可用工具",
			"toolFilterSearch": "搜索工具…",
			"toolFilterSelectAll": "全选",
			"toolFilterDeselectAll": "全不选",
			"toolFilterCount": "已选 {count} / 共 {total}",
			"toolFilterExpand": "展开",
			"toolFilterCollapse": "收起",
			"toolFilterNoMatch": "没有匹配搜索的工具。",
			"restoreDone": "已恢复默认",
			"invalidRoleId": "角色 id 必须为 kebab-case（小写字母、数字、单个连字符）。",
			"bridgeUnavailable": "此服务器尚未提供 Subagent Director 设置桥接通道（/subagent-director）。请重启 Web 应用以安装该通道后再试。",
			"modelRanOn": "子代理实际运行于",
			"modelNotRecorded": "尚未记录到子代理模型",
			"modelQueryFailed": "暂时无法获取子代理模型",
			"modelRanOnTitle": "模型路由：{model}",
			"closeContinuable": "终止可持续状态",
			"closeContinuableTitle": "释放此可持续子代理（解除驻留句柄）",
			"closingContinuable": "正在终止…",
			"closedSubagent": "已终止",
			"confirmCloseContinuable": "终止可持续子代理“{id}”？终止后将不再驻留，无法再用 send_message 继续它。",
			"closeFailed": "终止失败：{message}",
			"enforcementHeading": "编排守卫严格度",
			"enforcementHint": "strict：常驻与按轮编排都在工具层强制拦截写/执行类工具；lenient：仅在常驻模式工具层拦截，按轮编排仅提示（如实际所述）。",
			"enforcementStrict": "严格 (strict)",
			"enforcementLenient": "宽松 (lenient)",
			"enforcementStrictDesc": "常驻与按轮编排都强制（工具层拦截）",
			"enforcementLenientDesc": "仅常驻模式强制（按轮仅提示）"
		};
		//#endregion
		//#region src/bridge-contract.ts
		/** Absolute RPC channel the bridge owns on the Host web server. */
		const SUBAGENT_DIRECTOR_RPC_CHANNEL = "/subagent-director";
		/** Endpoint that returns the namespace's redacted wire view. */
		const SUBAGENT_DIRECTOR_RPC_VIEW = "settingsView";
		/** Endpoint that applies one path-op mutation. */
		const SUBAGENT_DIRECTOR_RPC_MUTATE = "settingsMutate";
		/** Endpoint that releases one resident continuable child of a live parent. */
		const SUBAGENT_DIRECTOR_RPC_CLOSE = "subagentClose";
		/** Endpoint that returns the actual provider/model of one child session. */
		const SUBAGENT_DIRECTOR_RPC_MODEL = "subagentModel";
		/** Endpoint that returns the model-visible tool catalog for role tool-set editing. */
		const SUBAGENT_DIRECTOR_RPC_TOOLS = "toolCatalog";
		//#endregion
		//#region src/client/store-logic.ts
		/** Path of the roles map from the section root. */
		const ROLES_PATH = ["roles"];
		/** Normalize an optional string: blank/whitespace becomes undefined (removed). */
		function optional(value) {
			if (value === void 0) return void 0;
			const trimmed = value.trim();
			return trimmed.length === 0 ? void 0 : trimmed;
		}
		/** Generate a kebab-case id from a display name; falls back to a prefix + counter. */
		function roleIdFromName(name, existing, prefix = "role") {
			const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
			const candidate = base.length > 0 ? base : prefix;
			if (!existing.has(candidate)) return candidate;
			for (let i = 2; i < 1e3; i++) if (!existing.has(candidate + "-" + i)) return candidate + "-" + i;
			return candidate + "-" + Date.now().toString(36);
		}
		/**
		* Build the path ops that create or fully replace one role. A single set at the
		* role's root writes every field at once (mutate resolves against the stored
		* section, so intermediate objects materialize).
		*/
		function addRoleOps(id, role) {
			return [{
				op: "set",
				path: [ROLES_PATH[0], id],
				value: {
					displayName: role.displayName,
					description: role.description,
					...optional(role.persona) !== void 0 ? { persona: optional(role.persona) } : {},
					...optional(role.provider) !== void 0 ? { provider: optional(role.provider) } : {},
					...optional(role.model) !== void 0 ? { model: optional(role.model) } : {},
					...optional(role.reasoningEffort) !== void 0 ? { reasoningEffort: optional(role.reasoningEffort) } : {},
					...(role.toolFilter?.allow?.length ?? 0) > 0 ? { toolFilter: {
						allow: role.toolFilter.allow,
						deny: []
					} } : {}
				}
			}];
		}
		/** Field-by-field set-edits when a value changed from the stored role; unset when cleared. */
		function fieldEdit(path, stored, next) {
			const store = typeof stored === "string" ? stored : void 0;
			const normalized = optional(next);
			if (normalized === store) return void 0;
			if (normalized === void 0) return {
				op: "unset",
				path: [...path]
			};
			return {
				op: "set",
				path: [...path],
				value: normalized
			};
		}
		/**
		* Diff the tool-set (allow list) between the stored role and the edited draft.
		* The editor manages only `allow`; an existing `deny` is preserved on set and
		* the whole filter is removed when the allow list is cleared. An empty allow
		* list means "inherit the parent's full tool set" (issue #2 semantics).
		* @param base - the role's field path (e.g. ['roles', id]).
		*/
		function toolFilterOps(base, before, draft) {
			const storedAllow = before?.toolFilter?.allow ?? [];
			const nextAllow = draft.toolFilter?.allow ?? [];
			const storedDeny = before?.toolFilter?.deny;
			if (storedAllow.length === nextAllow.length && storedAllow.every((name, i) => name === nextAllow[i])) return void 0;
			if (nextAllow.length === 0) return {
				op: "unset",
				path: [...base, "toolFilter"]
			};
			return {
				op: "set",
				path: [...base, "toolFilter"],
				value: {
					allow: [...nextAllow],
					...storedDeny !== void 0 ? { deny: storedDeny } : {}
				}
			};
		}
		/**
		* Diff one role between its stored value and the edited draft. Only changed
		* fields become ops; clearing a field becomes an unset that restores the
		* composition base / removes the user override.
		*/
		function updateRoleOps(id, before, draft) {
			const b = before ?? {};
			const ops = [];
			const push = (op) => {
				if (op) ops.push(op);
			};
			const base = [ROLES_PATH[0], id];
			push(fieldEdit([...base, "displayName"], b.displayName, draft.displayName));
			push(fieldEdit([...base, "description"], b.description, draft.description));
			push(fieldEdit([...base, "persona"], b.persona, draft.persona));
			push(fieldEdit([...base, "provider"], b.provider, draft.provider));
			push(fieldEdit([...base, "model"], b.model, draft.model));
			push(fieldEdit([...base, "reasoningEffort"], b.reasoningEffort, draft.reasoningEffort));
			push(toolFilterOps(base, before, draft));
			return ops;
		}
		/**
		* Ops to remove one role. When it was the defaultRole, the reference is cleared
		* too so a stale default never points at a removed role.
		*/
		function removeRoleOps(id, current) {
			const ops = [{
				op: "unset",
				path: [ROLES_PATH[0], id]
			}];
			if (current.defaultRole === id) ops.push({
				op: "unset",
				path: ["defaultRole"]
			});
			return ops;
		}
		/** Ops to promote one role to the default. */
		function setDefaultRoleOps(id) {
			return [{
				op: "set",
				path: ["defaultRole"],
				value: id
			}];
		}
		function defaultModelOps(before, edits) {
			const ops = [];
			const push = (op) => {
				if (op) ops.push(op);
			};
			push(fieldEdit(["defaultProvider"], before.defaultProvider, edits.provider));
			push(fieldEdit(["defaultModel"], before.defaultModel, edits.model));
			push(fieldEdit(["defaultReasoningEffort"], before.defaultReasoningEffort, edits.reasoningEffort));
			return ops;
		}
		/** Ops to clear every default-model field and the defaultRole back to composition defaults. */
		function restoreDefaultsOps(current) {
			const ops = [];
			if (current.defaultProvider !== void 0) ops.push({
				op: "unset",
				path: ["defaultProvider"]
			});
			if (current.defaultModel !== void 0) ops.push({
				op: "unset",
				path: ["defaultModel"]
			});
			if (current.defaultReasoningEffort !== void 0) ops.push({
				op: "unset",
				path: ["defaultReasoningEffort"]
			});
			if (current.defaultRole !== void 0) ops.push({
				op: "unset",
				path: ["defaultRole"]
			});
			return ops;
		}
		/** Ops to set the orchestrate enforcement level ('strict' | 'lenient'). */
		function enforcementOps(before, next) {
			if (before.orchestrateEnforcement === next) return [];
			return [{
				op: "set",
				path: ["orchestrateEnforcement"],
				value: next
			}];
		}
		/** Map an RPC error code to a UI outcome; unknown/undefined errors are fatal. */
		function classifyMutateError(code, _message) {
			if (code === "settings-conflict") return "conflict";
			if (code === "settings-rejected" || code === "schema-validation") return "rejected";
			return "fatal";
		}
		//#endregion
		//#region src/client/store.ts
		/** The settings namespace this page reads and writes. */
		const SUBAGENT_DIRECTOR_NS = "subagent-director";
		/** Initial empty snapshot. */
		function initialSubagentOptionsState() {
			return {
				status: "idle",
				error: null,
				writable: true,
				namespace: void 0,
				section: void 0,
				revision: 0,
				providers: [],
				models: [],
				tools: [],
				loading: false
			};
		}
		/** Human text for a rejected wire call. */
		function messageOf(error) {
			if (error instanceof Error) return error.message;
			return typeof error === "string" ? error : String(error);
		}
		/**
		* Raised when the /subagent-director bridge channel is not reachable on the
		* current transport (a Host that predates the bridge answers nothing). The
		* store surfaces this as the localized `bridgeUnavailable` copy instead of a
		* raw transport string.
		*/
		var BridgeUnavailableError = class extends Error {
			constructor() {
				super("Subagent Director settings bridge (/subagent-director) is not available on this server");
			}
		};
		/** Whether a thrown value means the bridge channel could not be called at all. */
		function isBridgeUnavailable(error) {
			return error instanceof BridgeUnavailableError;
		}
		/** The settings page controller (one per settings surface). */
		var SubagentOptionsStore = class {
			store;
			wire;
			generation = 0;
			/** Last session id used for the tool catalog (reused by refreshes). */
			lastSessionId;
			constructor(wire) {
				this.wire = wire;
				this.store = (0, _deepseek_ai_dsh_client_runtime_client.createSnapshotStore)(initialSubagentOptionsState());
			}
			/**
			* Call one bridge endpoint over the generic RPC channel. Returns the RpcResult
			* (ok or error branch). A transport-level rejection — the Host has no
			* /subagent-director channel — is folded into BridgeUnavailableError so the
			* caller can show the localized message.
			*/
			async callBridge(endpoint, payload) {
				let result;
				try {
					result = await this.wire.rpc.call(SUBAGENT_DIRECTOR_RPC_CHANNEL, endpoint, payload);
				} catch (error) {
					throw new BridgeUnavailableError();
				}
				if (!result.ok) return {
					ok: false,
					error: result.error
				};
				return {
					ok: true,
					value: result.value
				};
			}
			/** Refresh the whole page snapshot: provider directory + model catalog + own namespace. */
			async load(sessionId) {
				const generation = ++this.generation;
				if (sessionId !== void 0) this.lastSessionId = sessionId;
				const effectiveSessionId = this.lastSessionId;
				this.store.update((s) => {
					s.status = "loading";
					s.error = null;
					s.loading = true;
				});
				try {
					const [providersResponse, modelsResponse, viewResult, toolsResult] = await Promise.all([
						this.wire.llm.providers({}),
						this.wire.llm.models({}),
						this.callBridge(SUBAGENT_DIRECTOR_RPC_VIEW),
						this.callBridge(SUBAGENT_DIRECTOR_RPC_TOOLS, { sessionId: effectiveSessionId }).catch(() => ({
							ok: false,
							error: {
								code: "internal",
								message: "tool catalog unavailable"
							}
						}))
					]);
					if (!providersResponse.result.ok) throw new Error(providersResponse.result.error.message);
					if (!modelsResponse.result.ok) throw new Error(modelsResponse.result.error.message);
					if (!viewResult.ok) throw new Error(this.errorMessage(viewResult.error));
					if (generation !== this.generation) return;
					const view = viewResult.value.view;
					const section = view?.value ?? {};
					const writable = viewResult.value.writable;
					const providers = providersResponse.result.value.providers;
					const models = modelsResponse.result.value.groups;
					const tools = toolsResult.ok ? toolsResult.value.tools : [];
					this.store.update((s) => {
						s.status = "ready";
						s.error = null;
						s.writable = writable;
						s.providers = providers;
						s.models = models;
						s.tools = tools;
						s.namespace = view;
						s.section = section;
						s.revision = view?.revision ?? 0;
						s.loading = false;
					});
				} catch (error) {
					if (generation !== this.generation) return;
					this.store.update((s) => {
						s.status = "error";
						s.error = isBridgeUnavailable(error) ? this.wire.t("bridgeUnavailable") : messageOf(error);
						s.loading = false;
					});
				}
			}
			/** Human text for a bridge RPC error branch. */
			errorMessage(error) {
				if (error !== null && typeof error === "object" && "message" in error) {
					const message = error.message;
					if (typeof message === "string") return message;
				}
				return messageOf(error);
			}
			/**
			* Run one mutate and update the snapshot's revision. Returns a failure
			* message (localized by the caller) or undefined on success. A
			* settings-conflict re-reads the namespace and returns the conflict kind so
			* the UI can show the "please review and retry" message.
			*/
			async mutate(ops) {
				const state = this.store.getSnapshot();
				const ns = SUBAGENT_DIRECTOR_NS;
				const revision = state.revision;
				let result;
				try {
					result = await this.callBridge(SUBAGENT_DIRECTOR_RPC_MUTATE, {
						ns,
						ops,
						expectedRevision: revision
					});
				} catch (error) {
					return {
						ok: false,
						kind: "fatal",
						message: isBridgeUnavailable(error) ? this.wire.t("bridgeUnavailable") : messageOf(error)
					};
				}
				if (result.ok) {
					const admitted = result.value;
					this.store.update((s) => {
						s.revision = admitted.revision;
						s.namespace = admitted;
						s.section = admitted.value ?? {};
					});
					return {
						ok: true,
						kind: "fatal",
						message: void 0
					};
				}
				const code = this.errorCode(result.error);
				const message = this.errorMessage(result.error);
				const kind = classifyMutateError(code, message);
				if (kind === "conflict") {
					await this.reloadNamespace();
					return {
						ok: false,
						kind,
						message
					};
				}
				return {
					ok: false,
					kind,
					message
				};
			}
			async reloadNamespace() {
				try {
					const result = await this.callBridge(SUBAGENT_DIRECTOR_RPC_VIEW);
					if (!result.ok) return;
					const view = result.value.view;
					if (!view) return;
					this.store.update((s) => {
						s.namespace = view;
						s.section = view.value ?? {};
						s.revision = view.revision;
						s.writable = result.value.writable;
					});
				} catch {}
			}
			/** Error code of a bridge RPC error branch, when present. */
			errorCode(error) {
				if (error !== null && typeof error === "object" && "code" in error) {
					const code = error.code;
					return typeof code === "string" ? code : void 0;
				}
			}
			async addRole(id, draft) {
				const result = await this.mutate(addRoleOps(id, draft));
				return result.ok ? void 0 : result.message;
			}
			async updateRole(id, before, draft) {
				const result = await this.mutate(updateRoleOps(id, before, draft));
				return result.ok ? void 0 : result.message;
			}
			async removeRole(id) {
				const state = this.store.getSnapshot();
				const result = await this.mutate(removeRoleOps(id, { defaultRole: state.section?.defaultRole }));
				return result.ok ? void 0 : result.message;
			}
			async setDefaultRole(id) {
				const result = await this.mutate(setDefaultRoleOps(id));
				return result.ok ? void 0 : result.message;
			}
			async setDefaultModel(edits) {
				const state = this.store.getSnapshot();
				const result = await this.mutate(defaultModelOps(state.section ?? {}, edits));
				return result.ok ? void 0 : result.message;
			}
			async restoreDefaults() {
				const state = this.store.getSnapshot();
				const result = await this.mutate(restoreDefaultsOps(state.section ?? {}));
				return result.ok ? void 0 : result.message;
			}
			async setEnforcement(next) {
				const state = this.store.getSnapshot();
				const result = await this.mutate(enforcementOps(state.section ?? {}, next));
				return result.ok ? void 0 : result.message;
			}
		};
		//#endregion
		//#region src/client/toolset-logic.ts
		/**
		* Pure tool-set picker logic for the role editor (search / select-all /
		* deselect-all). Framework-free so the filtering and set algebra are
		* unit-testable without React.
		*
		* The select-all / deselect-all semantics follow the "filtered scope" rule:
		* they operate ONLY on the currently filtered tool names, never on tools the
		* search has hidden, so a user searching for "web" cannot accidentally select
		* every unrelated tool.
		*/
		/** Case-insensitive substring filter over tool names; empty query keeps all. */
		function filterToolNames(tools, query) {
			const q = query.trim().toLowerCase();
			if (q === "") return [...tools];
			return tools.filter((tool) => tool.toLowerCase().includes(q));
		}
		/** Toggle one tool name in the allow list (order-preserving). */
		function toggleToolName(current, name) {
			return current.includes(name) ? current.filter((n) => n !== name) : [...current, name];
		}
		/** Add every candidate to the allow list (deduplicated, order-preserving). */
		function addToolNames(current, candidates) {
			const set = new Set(current);
			for (const candidate of candidates) set.add(candidate);
			return [...set];
		}
		/** Remove every candidate from the allow list. */
		function removeToolNames(current, candidates) {
			const drop = new Set(candidates);
			return current.filter((name) => !drop.has(name));
		}
		//#endregion
		//#region src/client/ui.ts
		const token = {
			labelPrimary: "var(--dsw-alias-label-primary)",
			labelSecondary: "var(--dsw-alias-label-secondary)",
			labelTertiary: "var(--dsw-alias-label-tertiary)",
			border: "var(--dsw-alias-border-l2)",
			bgLayer1: "var(--dsw-alias-bg-layer-1)",
			bgLayer3: "var(--dsw-alias-bg-layer-3)",
			accent: "var(--dsw-alias-state-business-primary)",
			danger: "var(--dsw-alias-state-error-primary)",
			shadow: "var(--dsw-shadow-lv1)"
		};
		const rowStyle = {
			display: "flex",
			flexDirection: "column",
			gap: 6
		};
		const fieldLabelStyle = {
			color: token.labelSecondary,
			fontSize: 12,
			lineHeight: "16px"
		};
		const selectStyle = {
			height: 30,
			borderRadius: 6,
			border: "1px solid " + token.border,
			background: token.bgLayer1,
			color: token.labelPrimary,
			font: "inherit",
			fontSize: 13,
			padding: "0 8px",
			outline: "none"
		};
		const textInputStyle = {
			height: 30,
			borderRadius: 6,
			border: "1px solid " + token.border,
			background: token.bgLayer1,
			color: token.labelPrimary,
			font: "inherit",
			fontSize: 13,
			padding: "0 8px",
			outline: "none"
		};
		const textAreaStyle = {
			borderRadius: 6,
			border: "1px solid " + token.border,
			background: token.bgLayer1,
			color: token.labelPrimary,
			font: "inherit",
			fontSize: 13,
			lineHeight: "18px",
			padding: "6px 8px",
			resize: "vertical",
			minHeight: 56,
			outline: "none"
		};
		const primaryButtonStyle = {
			height: 28,
			borderRadius: 6,
			border: "1px solid " + token.accent,
			background: token.accent,
			color: "#fff",
			font: "inherit",
			fontSize: 13,
			cursor: "pointer",
			padding: "0 12px"
		};
		const ghostButtonStyle = {
			height: 28,
			borderRadius: 6,
			border: "1px solid " + token.border,
			background: "transparent",
			color: token.labelPrimary,
			font: "inherit",
			fontSize: 13,
			cursor: "pointer",
			padding: "0 12px"
		};
		const dangerButtonStyle = {
			...ghostButtonStyle,
			color: token.danger,
			borderColor: token.danger
		};
		const cardStyle = {
			border: "1px solid " + token.border,
			background: token.bgLayer3,
			borderRadius: 10,
			padding: 12,
			display: "flex",
			flexDirection: "column",
			gap: 10,
			minWidth: 0
		};
		const sectionWidth = {
			width: "100%",
			maxWidth: 760,
			display: "flex",
			flexDirection: "column",
			gap: 16,
			color: token.labelPrimary
		};
		//#endregion
		//#region src/client/ToolSetPicker.tsx
		/**
		* Tool-set picker shared by the role editor and the add-role form.
		*
		* A compact row that expands into: a search box, select-all / deselect-all
		* (scoped to the CURRENT filter — tools hidden by the search are never
		* touched), a live "selected / total" count, and a checkbox grid of the
		* filtered tools. Collapsed, it shows the label, the count, and a
		* chevron toggle so a large catalog (hundreds of MCP tools) stays compact.
		*/
		const style$2 = {
			root: {
				display: "flex",
				flexDirection: "column",
				gap: 6
			},
			head: {
				display: "flex",
				alignItems: "center",
				gap: 8
			},
			count: {
				color: token.labelTertiary,
				fontSize: 11,
				lineHeight: "16px"
			},
			search: {
				...textInputStyle,
				height: 26,
				fontSize: 12
			},
			grid: {
				display: "flex",
				flexDirection: "column",
				gap: 2,
				maxHeight: 260,
				overflowY: "auto",
				border: "1px solid " + token.border,
				borderRadius: 6,
				padding: "6px 8px",
				background: token.bgLayer1
			},
			item: {
				display: "inline-flex",
				alignItems: "center",
				gap: 4,
				fontSize: 12,
				color: token.labelSecondary,
				cursor: "pointer",
				padding: "2px 4px",
				borderRadius: 4
			},
			hint: {
				color: token.labelTertiary,
				fontSize: 11,
				lineHeight: "15px"
			},
			toggle: {
				...ghostButtonStyle,
				height: 24,
				fontSize: 12,
				padding: "0 8px"
			}
		};
		/** Render the searchable, select-all capable tool-set picker. */
		function ToolSetPicker({ tools, selected, onChange, t }) {
			const [query, setQuery] = (0, react.useState)("");
			const [open, setOpen] = (0, react.useState)(true);
			const filtered = (0, react.useMemo)(() => filterToolNames(tools, query), [tools, query]);
			(0, react.useMemo)(() => new Set(filtered), [filtered]);
			const allFilteredSelected = filtered.length > 0 && filtered.every((name) => selected.includes(name));
			if (tools.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: style$2.root,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
					style: fieldLabelStyle,
					children: t("toolFilter")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: style$2.hint,
					children: t("toolFilterEmpty")
				})]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: style$2.root,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: style$2.head,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								style: fieldLabelStyle,
								children: t("toolFilter")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: style$2.count,
								children: t("toolFilterCount", {
									count: selected.length,
									total: tools.length
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: style$2.toggle,
								onClick: () => setOpen((o) => !o),
								children: open ? t("toolFilterCollapse") : t("toolFilterExpand")
							})
						]
					}),
					open ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							style: style$2.search,
							value: query,
							placeholder: t("toolFilterSearch"),
							onChange: (e) => setQuery(e.target.value)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: 8
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: ghostButtonStyle,
								disabled: filtered.length === 0 || allFilteredSelected,
								onClick: () => onChange(addToolNames(selected, filtered)),
								children: t("toolFilterSelectAll")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: ghostButtonStyle,
								disabled: filtered.length === 0 || !filtered.some((name) => selected.includes(name)),
								onClick: () => onChange(removeToolNames(selected, filtered)),
								children: t("toolFilterDeselectAll")
							})]
						}),
						filtered.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: style$2.hint,
							children: t("toolFilterNoMatch")
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: style$2.grid,
							children: filtered.map((name) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: style$2.item,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "checkbox",
									checked: selected.includes(name),
									onChange: () => onChange(toggleToolName(selected, name))
								}), name]
							}, name))
						})
					] }) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: style$2.hint,
						children: selected.length === 0 ? t("toolFilterNone") : t("toolFilterHint")
					})
				]
			});
		}
		//#endregion
		//#region src/client/RoleCard.tsx
		/** One role template card: read-only summary plus an inline editor.
		* Provider/model/effort selects cascade from the model catalog; writes go
		* through the controller as path ops, and failures return a localized message. */
		function effortsFor$1(groups, provider, model) {
			if (!provider || !model) return [];
			return (groups.find((g) => g.id === provider)?.models.find((m) => m.id === model))?.reasoning?.efforts ?? [];
		}
		function RoleCard({ id, role, isDefault, groups, tools, t, onSave, onDelete, onSetDefault }) {
			const [editing, setEditing] = (0, react.useState)(false);
			const [busy, setBusy] = (0, react.useState)(false);
			const [failure, setFailure] = (0, react.useState)(void 0);
			const [draft, setDraft] = (0, react.useState)({
				displayName: role.displayName,
				description: role.description,
				persona: role.persona ?? "",
				provider: role.provider ?? "",
				model: role.model ?? "",
				reasoningEffort: role.reasoningEffort ?? "",
				toolFilter: { allow: role.toolFilter?.allow ?? [] }
			});
			const provider = draft.provider || role.provider;
			const model = draft.model || role.model;
			const modelOptions = provider ? groups.find((g) => g.id === provider)?.models ?? [] : [];
			const effortOptions = effortsFor$1(groups, provider, model);
			const save = async () => {
				setBusy(true);
				setFailure(void 0);
				try {
					const message = await onSave(draft);
					if (message !== void 0) {
						setFailure(message);
						return;
					}
					setEditing(false);
				} finally {
					setBusy(false);
				}
			};
			const remove = async () => {
				if (!window.confirm(t("confirmDeleteRole").replace("{id}", id))) return;
				setBusy(true);
				setFailure(void 0);
				try {
					const message = await onDelete();
					if (message !== void 0) setFailure(message);
				} finally {
					setBusy(false);
				}
			};
			const setField = (field, value) => {
				setDraft((d) => ({
					...d,
					[field]: value
				}));
			};
			const allowList = draft.toolFilter?.allow ?? [];
			if (editing) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: cardStyle,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "baseline",
							gap: 8
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
							style: {
								color: token.labelPrimary,
								fontSize: 14
							},
							children: t("roleDisplayName")
						}), isDefault ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								color: token.accent,
								fontSize: 12
							},
							children: t("defaultRoleBadge")
						}) : null]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: rowStyle,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
							style: fieldLabelStyle,
							children: t("roleDisplayName")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							style: textInputStyle,
							value: draft.displayName,
							placeholder: t("displayNamePlaceholder"),
							onChange: (e) => setField("displayName", e.target.value)
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: rowStyle,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
							style: fieldLabelStyle,
							children: t("roleDescription")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							style: textAreaStyle,
							value: draft.description,
							placeholder: t("descriptionPlaceholder"),
							onChange: (e) => setField("description", e.target.value)
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: rowStyle,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
							style: fieldLabelStyle,
							children: t("rolePersona")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							style: textAreaStyle,
							value: draft.persona,
							placeholder: t("personaPlaceholder"),
							onChange: (e) => setField("persona", e.target.value)
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "grid",
							gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
							gap: 8
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: rowStyle,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									style: fieldLabelStyle,
									children: t("provider")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									style: selectStyle,
									value: draft.provider,
									disabled: groups.length === 0,
									onChange: (e) => setField("provider", e.target.value),
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "",
										children: "—"
									}), groups.map((g) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: g.id,
										children: g.name
									}, g.id))]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: rowStyle,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									style: fieldLabelStyle,
									children: t("model")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									style: selectStyle,
									value: draft.model,
									disabled: modelOptions.length === 0,
									onChange: (e) => setField("model", e.target.value),
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "",
										children: "—"
									}), modelOptions.map((m) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: m.id,
										children: m.name
									}, m.id))]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: rowStyle,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									style: fieldLabelStyle,
									children: t("reasoningEffort")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									style: selectStyle,
									value: draft.reasoningEffort,
									disabled: effortOptions.length === 0,
									onChange: (e) => setField("reasoningEffort", e.target.value),
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "",
										children: "—"
									}), effortOptions.map((e) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: e.id,
										children: e.name
									}, e.id))]
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: rowStyle,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToolSetPicker, {
							tools,
							selected: allowList,
							t,
							onChange: (allow) => setDraft((d) => ({
								...d,
								toolFilter: { allow }
							}))
						})
					}),
					failure !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							color: token.danger,
							fontSize: 12
						},
						children: failure
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							gap: 8
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							style: primaryButtonStyle,
							disabled: busy,
							onClick: save,
							children: t("save")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							style: ghostButtonStyle,
							disabled: busy,
							onClick: () => setEditing(false),
							children: t("cancel")
						})]
					})
				]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: cardStyle,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "baseline",
							justifyContent: "space-between",
							gap: 8
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
							style: {
								color: token.labelPrimary,
								fontSize: 14
							},
							children: role.displayName || id
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								alignItems: "center",
								gap: 6
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									color: token.labelTertiary,
									fontSize: 12,
									fontVariantNumeric: "tabular-nums"
								},
								children: id
							}), isDefault ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									color: token.accent,
									fontSize: 12
								},
								children: t("defaultRoleBadge")
							}) : null]
						})]
					}),
					role.description ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: {
							margin: 0,
							color: token.labelSecondary,
							fontSize: 13,
							lineHeight: "18px"
						},
						children: role.description
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							flexWrap: "wrap",
							gap: 8
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Metadata, {
								label: t("provider"),
								value: role.provider
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Metadata, {
								label: t("model"),
								value: role.model
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Metadata, {
								label: t("reasoningEffort"),
								value: role.reasoningEffort
							}),
							role.persona ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Metadata, {
								label: t("persona"),
								value: role.persona
							}) : null,
							role.toolFilter?.allow?.length ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Metadata, {
								label: t("toolFilter"),
								value: role.toolFilter.allow.join(", ")
							}) : null
						]
					}),
					failure !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							color: token.danger,
							fontSize: 12
						},
						children: failure
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							gap: 8
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								style: ghostButtonStyle,
								disabled: busy,
								onClick: () => setEditing(true),
								children: t("edit")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								style: ghostButtonStyle,
								disabled: busy || isDefault,
								onClick: () => (onSetDefault(), void 0),
								children: t("setDefaultRole")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								style: dangerButtonStyle,
								disabled: busy,
								onClick: remove,
								children: t("deleteRole")
							})
						]
					})
				]
			});
		}
		function Metadata({ label, value }) {
			if (!value) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				style: {
					color: token.labelSecondary,
					fontSize: 12
				},
				children: [
					label,
					": ",
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: { color: token.labelPrimary },
						children: value
					})
				]
			});
		}
		//#endregion
		//#region src/client/SubagentOptionsSection.tsx
		/**
		* Subagent Director settings section (design section 9): the default-model row
		* plus the role-template cards. The slot outlet erases the share boundary and
		* delivers the inject face flat (PropsRuntime<'settings.section'> renderer is
		* the DSH shell); this component guards for a not-yet-injected render and then
		* renders its content column from the live snapshot.
		*
		* State lives in the page store (SubagentOptionsStore); every write travels as
		* path ops through settings.mutate with an optimistic-revision lock, so the
		* section only ever echoes the acknowledge-and-reload outcome. Failures return
		* a localized message that the save/delete/restore controls surface inline.
		*/
		/** Derive reasoning-effort options from the catalog for an exact provider+model. */
		function effortsFor(groups, provider, model) {
			if (!provider || !model) return [];
			return (groups.find((g) => g.id === provider)?.models.find((m) => m.id === model))?.reasoning?.efforts ?? [];
		}
		/**
		* Render the Subagent Director settings section content column.
		* @param props - slot-delivered injected dependencies.
		* @returns the section, or null while the shell has not injected yet.
		*/
		function SubagentOptionsSection(props) {
			const { controller, useSnapshot, t, useSessions } = props;
			if (controller === void 0 || useSnapshot === void 0 || t === void 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Loaded, { injected: {
				controller,
				useSnapshot,
				t,
				useSessions
			} });
		}
		function Loaded({ injected }) {
			const { controller, t } = injected;
			const state = injected.useSnapshot((s) => s);
			const sessionId = injected.useSessions !== void 0 ? injected.useSessions((s) => s.current) : void 0;
			const lastSessionRef = (0, react.useRef)(void 0);
			(0, react.useEffect)(() => {
				if (state.status === "idle" && !state.loading) controller.load(sessionId);
			}, [
				state.status,
				state.loading,
				sessionId
			]);
			(0, react.useEffect)(() => {
				if (state.status === "ready" && sessionId !== lastSessionRef.current) {
					lastSessionRef.current = sessionId;
					controller.load(sessionId);
				}
			}, [sessionId, state.status]);
			if (state.status === "error") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: sectionWidth,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
					style: {
						color: token.danger,
						fontSize: 13
					},
					children: [
						t("loadError"),
						": ",
						state.error ?? ""
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					style: ghostButtonStyle,
					onClick: () => void controller.load(),
					children: t("retry")
				})]
			});
			if (state.status !== "ready") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: sectionWidth,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					style: {
						color: token.labelSecondary,
						fontSize: 13
					},
					children: t("sectionIntro")
				})
			});
			const section = state.section;
			const writable = state.writable;
			const roles = section?.roles ?? {};
			const entries = Object.entries(roles);
			const groups = state.models;
			const tools = state.tools;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: sectionWidth,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: {
							margin: 0,
							color: token.labelSecondary,
							fontSize: 13,
							lineHeight: "18px"
						},
						children: t("sectionIntro")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DefaultModelRow, {
						controller,
						groups,
						writable,
						current: {
							provider: section?.defaultProvider,
							model: section?.defaultModel,
							reasoningEffort: section?.defaultReasoningEffort
						},
						t
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(EnforcementRow, {
						controller,
						writable,
						current: section?.orchestrateEnforcement ?? "strict",
						t
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RolesBlock, {
						controller,
						groups,
						tools,
						writable,
						roles: entries,
						defaultRole: section?.defaultRole,
						t
					})
				]
			});
		}
		/** The default-model row: provider → model → reasoning-effort cascade + restore. */
		function DefaultModelRow({ controller, groups, writable, current, t }) {
			const [draft, setDraft] = (0, react.useState)({
				provider: current.provider ?? "",
				model: current.model ?? "",
				reasoningEffort: current.reasoningEffort ?? ""
			});
			const [busy, setBusy] = (0, react.useState)(false);
			const [failure, setFailure] = (0, react.useState)(void 0);
			const [done, setDone] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				if (busy) return;
				setDraft({
					provider: current.provider ?? "",
					model: current.model ?? "",
					reasoningEffort: current.reasoningEffort ?? ""
				});
			}, [
				current.provider,
				current.model,
				current.reasoningEffort
			]);
			const provider = draft.provider;
			const model = draft.model;
			const modelOptions = provider ? groups.find((g) => g.id === provider)?.models ?? [] : [];
			const effortOptions = effortsFor(groups, provider, model);
			const save = async () => {
				setBusy(true);
				setFailure(void 0);
				try {
					const message = await controller.setDefaultModel({
						provider: draft.provider || void 0,
						model: draft.model || void 0,
						reasoningEffort: draft.reasoningEffort || void 0
					});
					if (message !== void 0) {
						setFailure(message);
						return;
					}
					setDone(true);
				} finally {
					setBusy(false);
				}
			};
			const restore = async () => {
				setBusy(true);
				setFailure(void 0);
				try {
					const message = await controller.restoreDefaults();
					if (message !== void 0) {
						setFailure(message);
						return;
					}
					setDone(true);
				} finally {
					setBusy(false);
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: cardStyle,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "baseline",
							justifyContent: "space-between",
							gap: 8
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
							style: {
								color: token.labelPrimary,
								fontSize: 14
							},
							children: t("defaultsHeading")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							style: ghostButtonStyle,
							disabled: !writable || busy,
							onClick: () => void restore(),
							children: t("restoreDefaults")
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: {
							margin: 0,
							color: token.labelSecondary,
							fontSize: 13,
							lineHeight: "18px"
						},
						children: t("defaultsHint")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "grid",
							gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
							gap: 8
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: rowStyle,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									style: fieldLabelStyle,
									children: t("defaultProvider")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									style: selectStyle,
									value: draft.provider,
									disabled: !writable || groups.length === 0,
									onChange: (e) => setDraft((d) => ({
										provider: e.target.value,
										model: "",
										reasoningEffort: ""
									})),
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "",
										children: "—"
									}), groups.map((g) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: g.id,
										children: g.name
									}, g.id))]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: rowStyle,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									style: fieldLabelStyle,
									children: t("defaultModel")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									style: selectStyle,
									value: draft.model,
									disabled: !writable || modelOptions.length === 0,
									onChange: (e) => setDraft((d) => ({
										...d,
										model: e.target.value,
										reasoningEffort: ""
									})),
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "",
										children: "—"
									}), modelOptions.map((m) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: m.id,
										children: m.name
									}, m.id))]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: rowStyle,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									style: fieldLabelStyle,
									children: t("defaultReasoningEffort")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									style: selectStyle,
									value: draft.reasoningEffort,
									disabled: !writable || effortOptions.length === 0,
									onChange: (e) => setDraft((d) => ({
										...d,
										reasoningEffort: e.target.value
									})),
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "",
										children: "—"
									}), effortOptions.map((e) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: e.id,
										children: e.name
									}, e.id))]
								})]
							})
						]
					}),
					failure !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							color: token.danger,
							fontSize: 12
						},
						children: failure
					}) : null,
					done ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							color: token.accent,
							fontSize: 12
						},
						children: t("restoreDone")
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							display: "flex",
							gap: 8
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							style: primaryButtonStyle,
							disabled: !writable || busy,
							onClick: () => void save(),
							children: t("save")
						})
					})
				]
			});
		}
		/** The orchestrate-guard strictness toggle (strict ⇄ lenient). */
		function EnforcementRow({ controller, writable, current, t }) {
			const [busy, setBusy] = (0, react.useState)(false);
			const [failure, setFailure] = (0, react.useState)(void 0);
			const [done, setDone] = (0, react.useState)(false);
			const choose = async (next) => {
				if (next === current) return;
				setBusy(true);
				setFailure(void 0);
				try {
					const message = await controller.setEnforcement(next);
					if (message !== void 0) {
						setFailure(message);
						return;
					}
					setDone(true);
				} finally {
					setBusy(false);
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: cardStyle,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: rowStyle,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
							style: {
								color: token.labelPrimary,
								fontSize: 14
							},
							children: t("enforcementHeading")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: {
								margin: 0,
								color: token.labelSecondary,
								fontSize: 13,
								lineHeight: "18px"
							},
							children: t("enforcementHint")
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							gap: 8
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							style: current === "strict" ? primaryButtonStyle : ghostButtonStyle,
							disabled: !writable || busy,
							onClick: () => void choose("strict"),
							children: t("enforcementStrict")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							style: current === "lenient" ? primaryButtonStyle : ghostButtonStyle,
							disabled: !writable || busy,
							onClick: () => void choose("lenient"),
							children: t("enforcementLenient")
						})]
					}),
					failure !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							color: token.danger,
							fontSize: 12
						},
						children: failure
					}) : null,
					done ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							color: token.accent,
							fontSize: 12
						},
						children: t("restoreDone")
					}) : null
				]
			});
		}
		/** The role-template roster: cards plus an inline add form. */
		function RolesBlock({ controller, groups, tools, writable, roles, defaultRole, t }) {
			const [adding, setAdding] = (0, react.useState)(false);
			const [draft, setDraft] = (0, react.useState)({
				displayName: "",
				description: "",
				persona: "",
				provider: "",
				model: "",
				reasoningEffort: "",
				toolFilter: { allow: [] }
			});
			const [busy, setBusy] = (0, react.useState)(false);
			const [failure, setFailure] = (0, react.useState)(void 0);
			const beginAdd = () => {
				setDraft({
					displayName: "",
					description: "",
					persona: "",
					provider: "",
					model: "",
					reasoningEffort: "",
					toolFilter: { allow: [] }
				});
				setFailure(void 0);
				setAdding(true);
			};
			const saveAdd = async () => {
				setBusy(true);
				setFailure(void 0);
				try {
					const existing = new Set(roles.map(([id]) => id));
					const id = roleIdFromName(draft.displayName, existing);
					const message = await controller.addRole(id, draft);
					if (message !== void 0) {
						setFailure(message);
						return;
					}
					setAdding(false);
				} finally {
					setBusy(false);
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: cardStyle,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "baseline",
							justifyContent: "space-between",
							gap: 8
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
							style: {
								color: token.labelPrimary,
								fontSize: 14
							},
							children: t("rolesHeading")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							style: ghostButtonStyle,
							disabled: !writable || adding,
							onClick: beginAdd,
							children: t("addRole")
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: {
							margin: 0,
							color: token.labelSecondary,
							fontSize: 13,
							lineHeight: "18px"
						},
						children: t("rolesHint")
					}),
					adding ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							border: "1px dashed " + token.border,
							borderRadius: 10,
							padding: 12,
							display: "flex",
							flexDirection: "column",
							gap: 10
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: rowStyle,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									style: fieldLabelStyle,
									children: t("roleDisplayName")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									style: textInputStyle,
									value: draft.displayName,
									placeholder: t("displayNamePlaceholder"),
									onChange: (e) => setDraft((d) => ({
										...d,
										displayName: e.target.value
									}))
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: rowStyle,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									style: fieldLabelStyle,
									children: t("roleDescription")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									style: textAreaStyle,
									value: draft.description,
									placeholder: t("descriptionPlaceholder"),
									onChange: (e) => setDraft((d) => ({
										...d,
										description: e.target.value
									}))
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: rowStyle,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToolSetPicker, {
									tools,
									selected: draft.toolFilter?.allow ?? [],
									t,
									onChange: (allow) => setDraft((d) => ({
										...d,
										toolFilter: { allow }
									}))
								})
							}),
							failure !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									color: token.danger,
									fontSize: 12
								},
								children: failure
							}) : null,
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									gap: 8
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									style: primaryButtonStyle,
									disabled: !writable || busy,
									onClick: () => void saveAdd(),
									children: t("addRole")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									style: ghostButtonStyle,
									disabled: busy,
									onClick: () => setAdding(false),
									children: t("cancel")
								})]
							})
						]
					}) : null,
					roles.length === 0 && !adding ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: {
							margin: 0,
							color: token.labelSecondary,
							fontSize: 13
						},
						children: t("emptyRoles")
					}) : roles.map(([id, role]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RoleCard, {
						id,
						role,
						isDefault: defaultRole === id,
						groups,
						tools,
						t,
						onSave: (d) => controller.updateRole(id, role, d),
						onDelete: () => controller.removeRole(id),
						onSetDefault: () => controller.setDefaultRole(id)
					}, id))
				]
			});
		}
		//#endregion
		//#region src/client/subagent-model.ts
		/**
		* Prefer the latest assistant message's reported provenance; fall back to its
		* requested config. Order walks the snapshot's node list from the tail so we
		* surface the most recent completed request, which is the meaningful one when
		* a subagent retried or only partially ran.
		*/
		function latestSubagentModel(snapshot) {
			if (snapshot === null || typeof snapshot !== "object") return { found: false };
			const nodes = snapshot.nodes;
			if (!Array.isArray(nodes)) return { found: false };
			for (let i = nodes.length - 1; i >= 0; i -= 1) {
				const node = nodes[i];
				if (node === null || typeof node !== "object") continue;
				if (node.kind !== "assistant") continue;
				const ref = provenanceOf(node);
				if (ref !== null) return ref;
			}
			return { found: false };
		}
		/** Resolve the model identity off one assistant message (provenance first). */
		function provenanceOf(assistant) {
			const reported = assistant.provenance;
			if (reported !== null && typeof reported === "object" && typeof reported.provider === "string" && reported.provider !== "" && typeof reported.model === "string" && reported.model !== "") return {
				found: true,
				provider: reported.provider,
				model: reported.model
			};
			const requested = assistant.requestConfig;
			if (requested !== null && typeof requested === "object" && typeof requested.provider === "string" && requested.provider !== "" && typeof requested.model === "string" && requested.model !== "") return {
				found: true,
				provider: requested.provider,
				model: requested.model
			};
			return null;
		}
		/**
		* Whether this conversation is an addressed subagent (a catalog-discovered
		* child) — the surface where the official read-only composer shows and where
		* a model readout is most useful. A null `subagent` on an ordinary session
		* returns false even when nodes carry provenance.
		*/
		function isAddressedSubagent(snapshot) {
			if (snapshot === null || snapshot === void 0) return false;
			const subagent = snapshot.subagent;
			return subagent !== null && subagent !== void 0;
		}
		/**
		* Compact provider/model label, e.g. "deepseek/deepseek-v4-flash". The model
		* id can already include a provider prefix; we do not hyphenate or re-quote
		* so the exact route stays readable in one line.
		*/
		function formatModelRef(ref) {
			return `${ref.provider}/${ref.model}`;
		}
		/**
		* Whether this session is a continuable child (the surface where the
		* "release sustained state" control is meaningful). Reads the catalog
		* address's mode; ordinary sessions and one-shot children are false.
		*/
		function isContinuableChild(snapshot) {
			if (snapshot === null || snapshot === void 0) return false;
			const address = snapshot.subagent?.address;
			return address !== void 0 && address !== null && address.mode === "continuable";
		}
		/**
		* Merge a local snapshot-derived lookup with a remote (RPC) lookup: the local
		* provenance wins when present (the runtime's own record), otherwise the
		* remote result decides. Kept pure so the dock's data-source preference is
		* unit-testable without a wire.
		*/
		function mergeModelLookup(local, remote) {
			return local.found ? local : remote;
		}
		//#endregion
		//#region src/client/SubagentModelDock.tsx
		/**
		* Subagent Director — M3b observability dock readout.
		*
		* Contributes a single ambient line to the `conversation.composer.dock` seat
		* (the band under the composer card). When the current session is an
		* addressed subagent child it shows the provider/model that child actually
		* ran on:
		*   - fast path: the opened transcript's latest assistant message already
		*     records provenance/requestConfig (zero extra RPC — see subagent-model.ts);
		*   - fallback: current DSH runtimes do not populate those fields, so the
		*     dock asks the Host bridge for the child's last `request/header` event
		*     (`subagentModel` endpoint) and caches the answer per child session.
		* When neither source proves a model it degrades to a short notice. Ordinary
		* sessions render nothing, so the dock stays clean.
		*
		* The dock is an additive list slot declared by ui-conversation at runtime;
		* we only contribute an occupant, never re-declare it. Our compile-time
		* SlotMap augmentation in index.ts narrows the registration typing.
		*/
		/** Inline styling using the shared token surface (no CSS pipeline; M2 deviation). */
		const style$1 = {
			root: {
				display: "flex",
				alignItems: "center",
				gap: 6,
				padding: "3px 16px",
				fontSize: 12,
				lineHeight: "16px",
				color: "var(--dsw-alias-label-tertiary)"
			},
			ref: {
				color: "var(--dsw-alias-label-secondary)",
				fontFamily: "var(--dsw-font-family-mono, monospace)"
			}
		};
		/** Render the provider/model readout for an addressed subagent, or nothing. */
		function SubagentModelDock({ session, rpc, t }) {
			const [query, setQuery] = (0, react.useState)({ status: "idle" });
			const cache = (0, react.useRef)(/* @__PURE__ */ new Map());
			const local = latestSubagentModel(session);
			const childSessionId = session?.subagent?.address?.childSessionId;
			const lastSeq = session && Array.isArray(session.nodes) && session.nodes.length > 0 ? session.nodes[session.nodes.length - 1].seq ?? 0 : 0;
			(0, react.useEffect)(() => {
				if (!isAddressedSubagent(session)) {
					setQuery({ status: "idle" });
					return;
				}
				if (local.found || childSessionId === void 0) return;
				const cached = cache.current.get(childSessionId);
				if (cached !== void 0) {
					setQuery(cached);
					return;
				}
				let alive = true;
				setQuery({ status: "querying" });
				rpc.call(SUBAGENT_DIRECTOR_RPC_CHANNEL, SUBAGENT_DIRECTOR_RPC_MODEL, { sessionId: childSessionId }).then((result) => {
					if (!alive) return;
					let next;
					if (result.ok) {
						const value = result.value;
						next = value.found === true ? {
							status: "found",
							ref: {
								found: true,
								provider: value.provider,
								model: value.model
							}
						} : { status: "missing" };
					} else next = { status: "failed" };
					cache.current.set(childSessionId, next);
					setQuery(next);
				}).catch(() => {
					if (!alive) return;
					const next = { status: "failed" };
					cache.current.set(childSessionId, next);
					setQuery(next);
				});
				return () => {
					alive = false;
				};
			}, [
				session?.sessionId,
				childSessionId,
				lastSeq,
				local.found,
				rpc
			]);
			if (!isAddressedSubagent(session)) return null;
			const lookup = mergeModelLookup(local, query.status === "found" ? query.ref : { found: false });
			if (!lookup.found) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: style$1.root,
				role: "status",
				children: query.status === "failed" ? t("modelQueryFailed") : t("modelNotRecorded")
			});
			const ref = lookup;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: style$1.root,
				role: "status",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("modelRanOn") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: style$1.ref,
					title: t("modelRanOnTitle", { model: formatModelRef(ref) }),
					children: formatModelRef(ref)
				})]
			});
		}
		//#endregion
		//#region src/client/SubagentCloseAction.tsx
		/**
		* Subagent Director — "release sustained state" header action (issue #1).
		*
		* Contributes one button to the `conversation.session.header.actions` seat
		* (the additive per-session control row beside the session title). It renders
		* only while the CURRENT session is a continuable subagent child
		* (snapshot.subagent.address.mode === 'continuable') and otherwise returns
		* null, so ordinary sessions and one-shot children see nothing.
		*
		* Clicking asks the Host bridge's `subagentClose` endpoint to
		* drainContinuableChildren under the address's durable parent authority; on
		* success the button turns into a settled label (the child's handle is
		* released), on failure a short inline error shows the core message.
		*
		* The seat is a list slot declared by ui-conversation; the framework session
		* standard kit supplies `useSession`/`sessionId` (dsh-client-runtime merge),
		* the registration injects the RPC caller.
		*/
		/** Inline styling using the shared token surface (no CSS pipeline; M2 deviation). */
		const style = {
			wrap: {
				display: "inline-flex",
				alignItems: "center",
				gap: 8
			},
			button: {
				...dangerButtonStyle,
				height: 24,
				fontSize: 12,
				padding: "0 10px"
			},
			settled: {
				color: token.labelTertiary,
				fontSize: 12,
				lineHeight: "16px"
			},
			error: {
				color: token.danger,
				fontSize: 12,
				lineHeight: "16px",
				maxWidth: 260,
				overflow: "hidden",
				textOverflow: "ellipsis",
				whiteSpace: "nowrap"
			}
		};
		/** Render the release-sustained-state button for a continuable child, or nothing. */
		function SubagentCloseAction({ useSession, sessionId, rpc, t }) {
			const session = useSession((s) => s);
			const [state, setState] = (0, react.useState)("idle");
			const [error, setError] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				setState("idle");
				setError(null);
			}, [sessionId]);
			if (!isContinuableChild(session)) return null;
			const address = session.subagent.address;
			const onClose = async () => {
				if (state === "closing") return;
				setState("closing");
				setError(null);
				try {
					const result = await rpc.call(SUBAGENT_DIRECTOR_RPC_CHANNEL, SUBAGENT_DIRECTOR_RPC_CLOSE, {
						parentSessionId: address.parentSessionId,
						childSessionId: address.childSessionId
					});
					if (result.ok) setState("closed");
					else {
						setState("failed");
						setError(result.error.message);
					}
				} catch {
					setState("failed");
				}
			};
			if (state === "closed") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: style.wrap,
				role: "status",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: style.settled,
					children: t("closedSubagent")
				})
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: style.wrap,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					style: style.button,
					disabled: state === "closing",
					onClick: () => {
						if (typeof window === "undefined" || window.confirm(t("confirmCloseContinuable", { id: address.childSessionId }))) onClose();
					},
					title: t("closeContinuableTitle", { id: address.childSessionId }),
					children: state === "closing" ? t("closingContinuable") : t("closeContinuable")
				}), state === "failed" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: style.error,
					role: "alert",
					children: t("closeFailed", { message: error ?? "" })
				})]
			});
		}
		//#endregion
		//#region src/client/index.ts
		/** Dictionary namespace owned by Subagent Director (bilingual, typed). */
		const NS = "settings.subagentDirector";
		/** Refetch the page snapshot only after its first load. */
		function refreshIfLoaded(controller) {
			if (controller.store.getSnapshot().status === "idle") return;
			controller.load();
		}
		/** Services required by the settings registration (cordis fiber inject). */
		const inject = [
			"slots",
			"locale",
			"connection",
			"remote"
		];
		/**
		* Register the Subagent Director section once the `settings.section`
		* declaration is on the ledger, wire its store to the connection, and keep it
		* fresh on every pushed invalidation (settings or provider topology).
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "subagent-director: copy dictionaries");
			const connection = ctx.get("connection");
			const t = ctx.locale.bind(NS);
			const controller = new SubagentOptionsStore({
				rpc: connection.rpc,
				llm: connection.api.llm,
				t
			});
			const useSnapshot = bindSnapshotSelector(controller.store);
			const injected = () => ({
				controller,
				useSnapshot,
				api: connection.api,
				t
			});
			const dockInjected = () => ({ rpc: connection.rpc });
			const closeInjected = () => ({ rpc: connection.rpc });
			ctx.effect(() => {
				const refresh = () => refreshIfLoaded(controller);
				const disposers = [
					ctx.remote.$on("settings/document-updated", refresh),
					ctx.remote.$on("llm/adapters-updated", refresh),
					ctx.on("connection/reset", refresh)
				];
				return () => {
					for (const dispose of disposers) dispose();
				};
			}, "subagent-director: pushed invalidations");
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "subagent-director",
				order: 20,
				label: () => t("nav"),
				locale: NS,
				inject: injected
			}, SubagentOptionsSection));
			ctx.slots.inject("conversation.composer.dock", () => ctx.slots.register({
				name: "conversation.composer.dock",
				id: "subagent-director-model",
				order: 90,
				locale: NS,
				inject: dockInjected
			}, SubagentModelDock));
			ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register({
				name: "conversation.session.header.actions",
				id: "subagent-director-close",
				order: 20,
				locale: NS,
				inject: closeInjected
			}, SubagentCloseAction));
		}
		//#endregion
		exports.NS = NS;
		exports.apply = apply;
		exports.en = en;
		exports.inject = inject;
		exports.refreshIfLoaded = refreshIfLoaded;
		exports.zh = zh;
		
		return module.exports;
	}
});
