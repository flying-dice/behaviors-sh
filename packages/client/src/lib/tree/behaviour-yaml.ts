import { stepBody, stepKind, type BehaviourNode } from '@behaviors-ui/behavior-spec';

const indent = (n: number) => '  '.repeat(n);

function escapeString(s: string): string {
    if (s === '') return '""';
    if (s.includes('\n')) {
        return '|\n' + s.split('\n').map((l) => '  ' + l).join('\n');
    }
    if (/[:#@`{}[\],&*?|<>=!%]/.test(s) || /^\s|\s$/.test(s)) {
        return JSON.stringify(s);
    }
    return s;
}

export function nodeToYaml(node: BehaviourNode, depth = 0): string {
    const pad = indent(depth);
    const lines: string[] = [];

    if ('$ref' in node) {
        lines.push(`${pad}$ref: ${escapeString(node.$ref)}`);
        return lines.join('\n');
    }

    lines.push(`${pad}type: ${node.type}`);
    lines.push(`${pad}name: ${escapeString(node.name)}`);
    if (node.description) {
        lines.push(`${pad}description: ${escapeString(node.description)}`);
    }
    if (node.retries != null) {
        lines.push(`${pad}retries: ${node.retries}`);
    }

    if (node.type === 'action') {
        lines.push(`${pad}steps:`);
        for (const step of node.steps) {
            const kind = stepKind(step);
            const body = stepBody(step);
            lines.push(`${pad}  - ${kind}: ${escapeString(body)}`);
        }
    } else {
        lines.push(`${pad}children:`);
        for (const child of node.children) {
            const childLines = nodeToYaml(child, depth + 2).split('\n');
            const [first, ...rest] = childLines;
            lines.push(`${pad}  - ${first!.trimStart()}`);
            for (const r of rest) lines.push(r);
        }
    }

    return lines.join('\n');
}
