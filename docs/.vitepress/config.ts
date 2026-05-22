import { defineConfig } from "vitepress";

const SITE_URL = "https://behaviors-sh.dev";
const SITE_TITLE = "behaviors-sh";
const SITE_TAGLINE =
	"Behaviour Trees for AI Agents — with a canvas to watch them work";
const SITE_DESCRIPTION =
	"behaviors-sh is an open-source behaviour-tree runtime for AI agents. Author trees in YAML, JSON, or TypeScript; drive them through MCP from Claude, ChatGPT, or any agent that speaks the protocol; open the trace in a browser canvas to see exactly what ran.";
const OG_IMAGE = `${SITE_URL}/mark.svg`;

const KEYWORDS = [
	"behaviour tree",
	"behavior tree",
	"behaviour trees",
	"behavior trees",
	"BT",
	"AI agents",
	"AI agent",
	"agentic",
	"agentic AI",
	"agentic workflow",
	"agent runtime",
	"agent orchestration",
	"LLM agents",
	"LLM workflow",
	"LLM orchestration",
	"deterministic agents",
	"durable agents",
	"resumable agents",
	"reproducible AI workflows",
	"composable agents",
	"Claude",
	"Claude Code",
	"ChatGPT",
	"MCP",
	"Model Context Protocol",
	"YAML workflow",
	"YAML agents",
	"execution viewer",
	"behaviors-sh",
];

// https://vitepress.dev/reference/site-config
export default defineConfig({
	title: SITE_TITLE,
	titleTemplate: `:title | ${SITE_TITLE} — ${SITE_TAGLINE}`,
	description: SITE_DESCRIPTION,
	lang: "en-GB",
	cleanUrls: true,

	sitemap: {
		hostname: SITE_URL,
	},

	head: [
		["meta", { name: "theme-color", content: "#12121c" }],
		["meta", { name: "keywords", content: KEYWORDS.join(", ") }],

		// Open Graph
		["meta", { property: "og:type", content: "website" }],
		["meta", { property: "og:site_name", content: SITE_TITLE }],
		["meta", { property: "og:title", content: SITE_TITLE }],
		["meta", { property: "og:description", content: SITE_DESCRIPTION }],
		["meta", { property: "og:url", content: SITE_URL }],
		["meta", { property: "og:image", content: OG_IMAGE }],
		["meta", { property: "og:locale", content: "en_GB" }],

		// Twitter Card
		["meta", { name: "twitter:card", content: "summary_large_image" }],
		["meta", { name: "twitter:title", content: SITE_TITLE }],
		["meta", { name: "twitter:description", content: SITE_DESCRIPTION }],
		["meta", { name: "twitter:image", content: OG_IMAGE }],

		// Fonts
		["link", { rel: "preconnect", href: "https://fonts.googleapis.com" }],
		[
			"link",
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossorigin: "",
			},
		],
		[
			"link",
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap",
			},
		],
	],

	transformPageData(pageData) {
		const path = pageData.relativePath
			.replace(/index\.md$/, "")
			.replace(/\.md$/, "");
		const canonical = `${SITE_URL}/${path}`.replace(/\/$/, "/");
		const isHome = pageData.relativePath === "index.md";
		const pageTitle = pageData.frontmatter.title ?? pageData.title;
		const title = isHome
			? `${SITE_TITLE} — ${SITE_TAGLINE}`
			: pageTitle
				? `${pageTitle} | ${SITE_TITLE} — ${SITE_TAGLINE}`
				: `${SITE_TITLE} — ${SITE_TAGLINE}`;
		const description = pageData.frontmatter.description ?? SITE_DESCRIPTION;

		pageData.frontmatter.head ??= [];
		pageData.frontmatter.head.push(
			["link", { rel: "canonical", href: canonical }],
			["meta", { property: "og:url", content: canonical }],
			["meta", { property: "og:title", content: title }],
			["meta", { property: "og:description", content: description }],
			["meta", { name: "twitter:title", content: title }],
			["meta", { name: "twitter:description", content: description }],
		);
	},

	themeConfig: {
		nav: [
			{ text: "Home", link: "/" },
			{ text: "Get started", link: "/getting-started" },
			{ text: "Concepts", link: "/concepts/" },
			{ text: "Guide", link: "/guide/writing-trees" },
		],

		sidebar: [
			{
				text: "Introduction",
				items: [{ text: "Get started", link: "/getting-started" }],
			},
			{
				text: "Concepts",
				items: [
					{ text: "Why behaviour trees?", link: "/concepts/" },
					{ text: "How it works", link: "/concepts/how-it-works" },
					{ text: "State", link: "/concepts/state" },
					{
						text: "Branches and actions",
						link: "/concepts/branches-and-actions",
					},
				],
			},
			{
				text: "Guide",
				items: [
					{ text: "Registering an MCP client", link: "/guide/mcp-clients" },
					{ text: "Driving over MCP", link: "/guide/mcp" },
					{ text: "URI schemes", link: "/guide/uris" },
					{ text: "Writing trees", link: "/guide/writing-trees" },
					{
						text: "Inspecting executions",
						link: "/guide/inspecting-executions",
					},
				],
			},
		],

		socialLinks: [
			{
				icon: "github",
				link: "https://github.com/flying-dice/behaviors-sh",
			},
		],

		footer: {
			message: "MIT licensed",
			copyright: "Built by Flying Dice",
		},

		search: {
			provider: "local",
		},
	},
});
