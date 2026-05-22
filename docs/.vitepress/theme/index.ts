// https://vitepress.dev/guide/custom-theme
import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import { h } from "vue";
import "./style.css";
import DslDemo from "./DslDemo.vue";
import HeroInfo from "./HeroInfo.vue";
import InstallDemo from "./InstallDemo.vue";
import TreeSvg from "./TreeSvg.vue";

export default {
	extends: DefaultTheme,
	enhanceApp({ app }: { app: import("vue").App }) {
		app.component("TreeSvg", TreeSvg);
		app.component("DslDemo", DslDemo);
		app.component("InstallDemo", InstallDemo);
	},
	Layout: () =>
		h(DefaultTheme.Layout, null, {
			"home-hero-info": () => h(HeroInfo),
		}),
} satisfies Theme;
