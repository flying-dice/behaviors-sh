// Display helpers shared by the executions components. Pure functions.

export type StatusKind = 'running' | 'done' | 'failure' | 'other';

export function classifyStatus(status: string): StatusKind {
	const s = status.toLowerCase();
	if (s === 'running') return 'running';
	if (s === 'complete' || s === 'done' || s === 'success') return 'done';
	if (s === 'failed' || s === 'failure' || s === 'error') return 'failure';
	return 'other';
}

export const STATUS_CLASSES: Record<StatusKind, string> = {
	running:
		'bg-amber-500/15 text-amber-600 dark:text-amber-300 ring-amber-500/30',
	done: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 ring-emerald-500/30',
	failure: 'bg-red-500/15 text-red-600 dark:text-red-300 ring-red-500/30',
	other: 'bg-muted text-muted-foreground ring-border',
};

export const STATUS_DOT: Record<StatusKind, string> = {
	running: 'bg-amber-500 animate-pulse',
	done: 'bg-emerald-500',
	failure: 'bg-red-500',
	other: 'bg-muted-foreground',
};

const TRACE_KIND_CLASSES: Record<string, string> = {
	evaluate: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300',
	instruct: 'bg-violet-500/15 text-violet-600 dark:text-violet-300',
	protocol: 'bg-blue-500/15 text-blue-600 dark:text-blue-300',
	think: 'bg-muted text-muted-foreground',
};

export function traceKindClass(kind: string): string {
	return TRACE_KIND_CLASSES[kind] ?? TRACE_KIND_CLASSES.think!;
}

export function formatRelativeTime(iso: string, now = Date.now()): string {
	const t = Date.parse(iso);
	if (Number.isNaN(t)) return iso;
	const diffMs = now - t;
	if (diffMs < 0) return 'in the future';
	const secs = Math.floor(diffMs / 1000);
	if (secs < 5) return 'just now';
	if (secs < 60) return `${secs}s ago`;
	const mins = Math.floor(secs / 60);
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

export function formatExactTime(iso: string): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleString(undefined, {
		year: 'numeric',
		month: 'short',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	});
}

// Short, scannable summary of a URI for list rows. Strips scheme +
// directory prefixes so what's left is the identifier the caller
// actually chose for this run.
export function shortenUri(uri: string): string {
	if (uri.startsWith('memory://')) return uri.slice('memory://'.length);
	if (uri.startsWith('file://')) {
		const segs = uri.split('/');
		return segs[segs.length - 1] ?? uri;
	}
	return uri;
}
