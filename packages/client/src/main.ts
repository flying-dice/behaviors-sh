import { mount } from "svelte";
import "./app.css";
import App from "./App.svelte";

const target = document.getElementById("app");
if (!target) throw new Error("missing #app mount target in index.html");

// Mount under a try/catch so a module-init throw lands as a visible
// error in the DOM instead of a blank page. Without this, a single
// import-time exception (e.g. one of the shadcn primitives mis-imported
// as `type`-only by an over-eager organize-imports pass) leaves the
// container empty and the user with nothing but DevTools to diagnose.
let app: ReturnType<typeof mount> | null = null;
try {
	app = mount(App, { target });
} catch (err) {
	const message =
		err instanceof Error ? (err.stack ?? err.message) : String(err);
	target.innerHTML = `
		<div style="
			padding: 32px;
			font: 14px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
			color: #f87171;
			background: #1a1a1a;
			min-height: 100vh;
			white-space: pre-wrap;
		">
			<div style="color: #fafafa; font-weight: 600; margin-bottom: 12px;">
				The behaviors-sh client failed to start.
			</div>
			<div>${message.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</div>
		</div>
	`;
	throw err;
}

export default app;
