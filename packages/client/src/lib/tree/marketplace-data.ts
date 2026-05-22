import type { BehaviourNode } from '@behaviors-ui/spec';
import type { NodeType } from './types';

export interface Shape {
  type: NodeType;
  children?: Shape[];
}

export function shapeFromTree(node: BehaviourNode): Shape {
  if ('$ref' in node) return { type: 'instruct' };
  if (node.type === 'action') return { type: 'instruct' };
  return {
    type: node.type,
    children: node.children.map(shapeFromTree),
  };
}

export type ColorHint = 'cyan' | 'pink' | 'purple' | 'red' | 'yellow' | 'green' | 'orange';

export interface MarketItem {
  id: string;
  name: string;
  author: string;
  version: string;
  downloads: number;
  stars: number;
  tags: string[];
  blurb: string;
  description: string;
  colorHint: ColorHint;
  shape: Shape;
  nodes: number;
  updated: string;
  verified: boolean;
}

export const MARKETPLACE: MarketItem[] = [
  {
    id: 'research-assistant',
    name: 'Research assistant',
    author: '@nadia.rivera',
    version: '1.4.2',
    downloads: 14_283,
    stars: 412,
    tags: ['research', 'rag', 'citations'],
    blurb: 'Search → fetch → summarise → cite. Drop-in for any RAG agent.',
    description:
      'A four-stage research loop with citation enforcement. Bring your own search provider via $CONST.SEARCH_BACKEND.',
    colorHint: 'cyan',
    shape: {
      type: 'sequence',
      children: [
        { type: 'instruct' },
        { type: 'parallel', children: [{ type: 'instruct' }, { type: 'instruct' }, { type: 'instruct' }] },
        { type: 'instruct' },
        { type: 'instruct' },
      ],
    },
    nodes: 12,
    updated: '3 days ago',
    verified: true,
  },
  {
    id: 'customer-support-triage',
    name: 'Support triage',
    author: '@helpscout-labs',
    version: '2.0.1',
    downloads: 9_184,
    stars: 287,
    tags: ['support', 'classification', 'routing'],
    blurb: 'Classify the inbound ticket, fetch context, hand off or auto-reply.',
    description:
      'Multi-tier escalation tree. Drops a hand-off to a human when confidence dips below a threshold.',
    colorHint: 'pink',
    shape: {
      type: 'selector',
      children: [
        { type: 'sequence', children: [{ type: 'instruct' }, { type: 'instruct' }] },
        { type: 'sequence', children: [{ type: 'instruct' }, { type: 'instruct' }, { type: 'instruct' }] },
        { type: 'instruct' },
      ],
    },
    nodes: 18,
    updated: '1 week ago',
    verified: true,
  },
  {
    id: 'deploy-canary',
    name: 'Canary deploy',
    author: '@flying-dice',
    version: '0.9.0',
    downloads: 6_402,
    stars: 198,
    tags: ['deploy', 'rollout', 'k8s'],
    blurb: 'Push 1% → watch SLOs → ramp or rollback. Battle-tested.',
    description:
      'A canary rollout tree with automatic rollback on SLO regression. Plays well with Argo Rollouts.',
    colorHint: 'purple',
    shape: {
      type: 'sequence',
      children: [
        { type: 'instruct' },
        { type: 'parallel', children: [{ type: 'instruct' }, { type: 'instruct' }] },
        {
          type: 'selector',
          children: [
            { type: 'instruct' },
            { type: 'sequence', children: [{ type: 'instruct' }, { type: 'instruct' }] },
          ],
        },
      ],
    },
    nodes: 16,
    updated: '5 days ago',
    verified: true,
  },
  {
    id: 'incident-commander',
    name: 'Incident commander',
    author: '@pager.ai',
    version: '3.1.0',
    downloads: 4_998,
    stars: 156,
    tags: ['sre', 'oncall', 'incident'],
    blurb: 'From page to post-mortem. Coordinates the comms loop.',
    description:
      'End-to-end incident response: triage, mitigation, comms, post-mortem draft. Hooks into PagerDuty + Slack.',
    colorHint: 'red',
    shape: {
      type: 'sequence',
      children: [
        { type: 'instruct' },
        {
          type: 'parallel',
          children: [{ type: 'instruct' }, { type: 'instruct' }, { type: 'instruct' }],
        },
        { type: 'selector', children: [{ type: 'instruct' }, { type: 'instruct' }] },
        { type: 'instruct' },
      ],
    },
    nodes: 21,
    updated: '2 weeks ago',
    verified: false,
  },
  {
    id: 'data-pipeline-cleanup',
    name: 'Pipeline doctor',
    author: '@dbt-collective',
    version: '1.0.4',
    downloads: 3_211,
    stars: 89,
    tags: ['data', 'etl', 'diagnostics'],
    blurb: 'Diagnose a stuck pipeline, attempt repair, escalate if needed.',
    description:
      'Walks a failing dbt run, classifies the failure, attempts a deterministic fix, escalates to oncall.',
    colorHint: 'yellow',
    shape: {
      type: 'sequence',
      children: [
        { type: 'instruct' },
        {
          type: 'selector',
          children: [{ type: 'instruct' }, { type: 'instruct' }, { type: 'instruct' }],
        },
        { type: 'instruct' },
      ],
    },
    nodes: 9,
    updated: '1 month ago',
    verified: false,
  },
  {
    id: 'npc-patrol',
    name: 'NPC patrol/chase',
    author: '@cogentic.games',
    version: '0.5.0',
    downloads: 2_440,
    stars: 312,
    tags: ['games', 'npc', 'classic'],
    blurb: 'The original behaviour tree. Patrol, spot, chase, attack, retreat.',
    description:
      'A faithful port of the classic AAA NPC behaviour tree. Tweak the perception cones in the blackboard.',
    colorHint: 'green',
    shape: {
      type: 'selector',
      children: [
        { type: 'sequence', children: [{ type: 'instruct' }, { type: 'instruct' }, { type: 'instruct' }] },
        { type: 'sequence', children: [{ type: 'instruct' }, { type: 'instruct' }] },
        { type: 'instruct' },
      ],
    },
    nodes: 11,
    updated: '3 months ago',
    verified: true,
  },
  {
    id: 'security-scan',
    name: 'Security audit',
    author: '@parity-sec',
    version: '1.2.0',
    downloads: 1_976,
    stars: 64,
    tags: ['security', 'sast', 'scanning'],
    blurb: 'SAST + dependency audit + secret scan, summarised as a report.',
    description: 'Three-prong audit pass. Produces a Markdown report keyed by severity.',
    colorHint: 'purple',
    shape: {
      type: 'sequence',
      children: [
        {
          type: 'parallel',
          children: [{ type: 'instruct' }, { type: 'instruct' }, { type: 'instruct' }],
        },
        { type: 'instruct' },
      ],
    },
    nodes: 7,
    updated: '1 week ago',
    verified: true,
  },
  {
    id: 'docs-writer',
    name: 'Docs writer',
    author: '@writethefckdocs',
    version: '2.1.3',
    downloads: 1_502,
    stars: 211,
    tags: ['docs', 'markdown', 'ci'],
    blurb: 'Diff the public API, write the changelog, file the PR.',
    description:
      'Watches for surface changes and drafts user-facing docs with citations to the underlying commits.',
    colorHint: 'cyan',
    shape: {
      type: 'sequence',
      children: [
        { type: 'instruct' },
        { type: 'instruct' },
        { type: 'parallel', children: [{ type: 'instruct' }, { type: 'instruct' }] },
        { type: 'instruct' },
      ],
    },
    nodes: 8,
    updated: '2 weeks ago',
    verified: false,
  },
];

export function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

export function synthShape(id: string): Shape {
  let seed = 0;
  for (const c of id) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  const build = (depth: number): Shape => {
    if (depth >= 2 || rand() < 0.35) return { type: 'instruct' };
    const types: NodeType[] = ['sequence', 'selector', 'parallel'];
    const t = types[Math.floor(rand() * types.length)];
    const n = 2 + Math.floor(rand() * 2.5);
    return { type: t, children: Array.from({ length: n }, () => build(depth + 1)) };
  };
  return {
    type: rand() < 0.5 ? 'sequence' : 'selector',
    children: Array.from({ length: 2 + Math.floor(rand() * 3) }, () => build(1)),
  };
}
