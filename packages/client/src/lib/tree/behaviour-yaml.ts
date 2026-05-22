import { stepBody, stepKind, type BehaviourNode } from '@behaviors-sh/spec';

const LINE_WIDTH = 60;
const indent = (n: number) => '  '.repeat(n);

function wordWrap(s: string, width: number): string[] {
    const lines: string[] = [];
    let line = '';
    for (const word of s.split(' ')) {
        if (line && line.length + 1 + word.length > width) {
            lines.push(line);
            line = word;
        } else {
            line = line ? line + ' ' + word : word;
        }
    }
    if (line) lines.push(line);
    return lines;
}

function escapeString(s: string, depth = 0): string {
    if (s === '') return '""';
    const contentPad = indent(depth + 1);
    if (s.includes('\n')) {
        return '|\n' + s.split('\n').map((l) => contentPad + l).join('\n');
    }
    if (s.length > LINE_WIDTH) {
        const wrapped = wordWrap(s, LINE_WIDTH);
        return '>\n' + wrapped.map((l) => contentPad + l).join('\n');
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
        lines.push(`${pad}$ref: ${escapeString(node.$ref, depth)}`);
        return lines.join('\n');
    }

    lines.push(`${pad}type: ${node.type}`);
    lines.push(`${pad}name: ${escapeString(node.name, depth)}`);
    if (node.description) {
        lines.push(`${pad}description: ${escapeString(node.description, depth)}`);
    }
    if (node.retries != null) {
        lines.push(`${pad}retries: ${node.retries}`);
    }

    if (node.type === 'action') {
        lines.push(`${pad}steps:`);
        for (const step of node.steps) {
            const kind = stepKind(step);
            const body = stepBody(step);
            lines.push(`${pad}  - ${kind}: ${escapeString(body, depth + 1)}`);
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
