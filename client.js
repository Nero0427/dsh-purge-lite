/**
 * 浏览器半区：设置页的只读状态面板。
 *
 * 面板只读两个接口：`/dsh-purge/status` 与 `/dsh-purge/prompt-text`。
 * 不做编辑、不做保存——注入正文属于用户文件，改它请直接改 `prompt-inject.md`，
 * 或者用 `dsh-purge --edit`。
 *
 * 用同源相对路径通信，不写死端口（桌面端 HTTP 服务端口是随机的）。
 *
 * @file client.js
 */
window.__ModuleLoader__.load({
	id: "dsh-purge",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		const react = require("react");
		const h = react.createElement;

		const name = "dsh-purge";
		const inject = ["slots"];

		/* 主题变量取不到时的兜底色 */
		const C = {
			text: "var(--dsw-alias-label-primary, #ececec)",
			sub: "var(--dsw-alias-label-secondary, rgba(170,175,182,0.92))",
			dim: "var(--dsw-alias-label-tertiary, rgba(150,155,162,0.72))",
			bg: "var(--dsw-alias-bg-secondary, rgba(255,255,255,0.045))",
			bgDeep: "rgba(0,0,0,0.24)",
			border: "var(--dsw-alias-border-secondary, rgba(255,255,255,0.085))",
			borderSoft: "var(--dsw-alias-border-tertiary, rgba(255,255,255,0.055))",
			green: "#22c55e",
			gray: "rgba(150,155,162,0.6)",
		};
		const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Courier New', monospace";

		function apiUrl(p) {
			try { return new URL(p, window.location.origin).toString(); } catch { return p; }
		}
		function getJson(url) {
			return fetch(url, { credentials: "same-origin" })
				.then((r) => r.json())
				.catch(() => null);
		}
		function fmtBytes(n) {
			if (!n && n !== 0) return "—";
			if (n < 1024) return n + " B";
			if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
			return (n / 1048576).toFixed(2) + " MB";
		}
		function fmtTime(ms) {
			if (!ms) return "—";
			try {
				const d = new Date(ms);
				const p = (x) => String(x).padStart(2, "0");
				return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
					" " + p(d.getHours()) + ":" + p(d.getMinutes());
			} catch { return "—"; }
		}

		function Stat(props) {
			return h("div", {
				style: {
					flex: "1 1 0",
					minWidth: "0",
					padding: "10px 14px",
					borderRadius: "10px",
					background: C.bgDeep,
					border: "1px solid " + C.borderSoft,
				},
			}, [
				h("div", {
					key: "l",
					style: { fontSize: "11px", lineHeight: "15px", color: C.dim, letterSpacing: "0.02em" },
				}, props.label),
				h("div", {
					key: "v",
					style: {
						marginTop: "4px",
						fontSize: "15px",
						lineHeight: "20px",
						fontWeight: "600",
						color: C.text,
						fontVariantNumeric: "tabular-nums",
						whiteSpace: "nowrap",
						overflow: "hidden",
						textOverflow: "ellipsis",
					},
				}, props.value),
			]);
		}

		function PurgeSection() {
			const [state, setState] = react.useState({ loading: true, data: null });
			const [refreshing, setRefreshing] = react.useState(false);

			const load = react.useCallback((manual) => {
				if (manual) setRefreshing(true);
				return getJson(apiUrl("/dsh-purge/prompt-text")).then((d) => {
					setState({ loading: false, data: d && d.ok ? d : null });
					if (manual) setRefreshing(false);
				});
			}, []);

			react.useEffect(() => { load(false); }, [load]);

			const d = state.data;
			const ok = Boolean(d);

			/* 插件装上即生效，没有运行时开关；关闭只能卸载。状态只反映「读到没有」。 */
			const statusColor = ok ? C.green : C.gray;
			const statusText = ok ? "已开启" : "读取中";
			const statusHint = ok
				? "提示词注入已加载，正文会附加在每个会话的 system prompt 里。停用需卸载插件。"
				: "正在读取注入正文…";

			return h("div", {
				style: {
					display: "flex",
					flexDirection: "column",
					gap: "14px",
					color: C.text,
					fontSize: "13px",
					lineHeight: "20px",
				},
			},
				/* 状态卡 */
				h("div", {
					key: "status",
					style: {
						padding: "16px 18px",
						borderRadius: "12px",
						background: C.bg,
						border: "1px solid " + C.border,
					},
				}, [
					h("div", { key: "row", style: { display: "flex", alignItems: "center", gap: "10px" } }, [
						h("span", {
							key: "dot",
							style: {
								width: "9px", height: "9px", borderRadius: "50%",
								flex: "none",
								background: statusColor,
								boxShadow: ok ? "0 0 8px rgba(34,197,94,0.75)" : "none",
							},
						}),
						h("span", {
							key: "t",
							style: {
								fontSize: "17px",
								lineHeight: "22px",
								fontWeight: "650",
								letterSpacing: "0.01em",
								color: C.text,
							},
						}, statusText),
						h("span", {
							key: "badge",
							style: {
								marginLeft: "2px",
								padding: "1px 7px",
								borderRadius: "999px",
								fontSize: "10.5px",
								lineHeight: "16px",
								fontWeight: "600",
								letterSpacing: "0.03em",
								color: ok ? "rgba(34,197,94,0.95)" : C.dim,
								background: ok ? "rgba(34,197,94,0.14)" : "rgba(150,155,162,0.12)",
								border: "1px solid " + (ok ? "rgba(34,197,94,0.32)" : C.borderSoft),
							},
						}, ok ? "ACTIVE" : "IDLE"),
					]),
					h("div", {
						key: "hint",
						style: { marginTop: "7px", fontSize: "12.5px", lineHeight: "19px", color: C.sub },
					}, statusHint),
				]),

				/* 统计 */
				h("div", { key: "stats", style: { display: "flex", gap: "10px" } }, [
					h(Stat, { key: "b", label: "正文大小", value: ok ? fmtBytes(d.bytes) : "—" }),
					h(Stat, { key: "l", label: "行数", value: ok ? String(d.lines) : "—" }),
					h(Stat, { key: "m", label: "最后修改", value: ok ? fmtTime(d.mtime) : "—" }),
				]),

				/* 路径 */
				h("div", {
					key: "path",
					style: {
						display: "flex", alignItems: "center", gap: "8px",
						padding: "9px 12px",
						borderRadius: "9px",
						background: C.bgDeep,
						border: "1px solid " + C.borderSoft,
					},
				}, [
					h("span", {
						key: "k",
						style: { flex: "none", fontSize: "11.5px", color: C.dim },
					}, "来源文件"),
					h("span", {
						key: "v",
						title: ok ? d.path : "",
						style: {
							flex: "1 1 auto", minWidth: "0",
							fontFamily: MONO, fontSize: "11.5px",
							color: C.sub,
							whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
						},
					}, ok ? d.path : "—"),
				]),

				/* 提示词正文 */
				h("div", {
					key: "body",
					style: {
						borderRadius: "12px",
						background: C.bg,
						border: "1px solid " + C.border,
						overflow: "hidden",
					},
				}, [
					h("div", {
						key: "bar",
						style: {
							display: "flex", alignItems: "center", gap: "8px",
							padding: "10px 14px",
							borderBottom: "1px solid " + C.borderSoft,
						},
					}, [
						h("span", {
							key: "t",
							style: { flex: "1 1 auto", fontSize: "12.5px", fontWeight: "600", color: C.text },
						}, "提示词正文"),
						h("span", {
							key: "ro",
							style: {
								padding: "1px 7px", borderRadius: "999px",
								fontSize: "10.5px", lineHeight: "16px",
								color: C.dim,
								background: "rgba(150,155,162,0.10)",
								border: "1px solid " + C.borderSoft,
							},
						}, "只读"),
						h("button", {
							key: "r",
							onClick: () => load(true),
							disabled: refreshing,
							style: {
								marginLeft: "2px",
								padding: "3px 10px",
								borderRadius: "7px",
								fontSize: "11.5px",
								lineHeight: "17px",
								color: C.sub,
								background: "rgba(255,255,255,0.05)",
								border: "1px solid " + C.borderSoft,
								cursor: refreshing ? "progress" : "pointer",
								opacity: refreshing ? "0.6" : "1",
							},
						}, refreshing ? "读取中" : "重新读取"),
					]),
					h("pre", {
						key: "pre",
						style: {
							margin: "0",
							padding: "14px 16px",
							maxHeight: "440px",
							overflowY: "auto",
							overflowX: "auto",
							background: C.bgDeep,
							fontFamily: MONO,
							fontSize: "11.5px",
							lineHeight: "1.72",
							color: C.sub,
							whiteSpace: "pre-wrap",
							wordBreak: "break-word",
							tabSize: "2",
						},
					}, ok && d.text ? d.text : (state.loading ? "读取中…" : "未读到提示词文件")),
				]),
			);
		}

		function apply(ctx) {
			if (!ctx || !ctx.slots || typeof ctx.slots.inject !== "function") return;
			try {
				ctx.slots.inject("settings.section", () => ctx.slots.register({
					name: "settings.section",
					id: "dsh-purge",
					order: 90,
					label: "Purge",
				}, PurgeSection));
			} catch (e) {
				try { console.warn("[dsh-purge] settings section skipped:", e); } catch { /* ignore */ }
			}
		}

		exports.name = name;
		exports.inject = inject;
		exports.apply = apply;
		return module.exports;
	}
});
