import {
	action,
	evaluate,
	instruct,
	parallel,
	sequence,
	variable,
} from "@behaviors-sh/dsl";

export const cleanCodeReview = sequence("Clean_Code_Review", (node) => {
	node.version = "0.1.0";
	node.description =
		"Review the working tree against the five clean-code principles — single responsibility, loose coupling, testability, naming, openness to extension — plus a final 'done means' checklist. Emits one consolidated report.";

	const diffSummary = variable("diff_summary", null);

	const findingsSingleResponsibility = variable(
		"findings_single_responsibility",
		null,
	);
	const findingsLooseCoupling = variable("findings_loose_coupling", null);
	const findingsTestability = variable("findings_testability", null);
	const findingsNaming = variable("findings_naming", null);
	const findingsExtension = variable("findings_extension", null);
	const findingsDoneMeans = variable("findings_done_means", null);

	const consolidatedReport = variable("consolidated_report", null);

	action("Summarize_Diff", () => {
		instruct(`
			Run \`git status\` and \`git diff HEAD\` and write a short
			2-4 sentence summary of what is changing (which modules,
			rough intent). Store at ${diffSummary}. Do not classify the
			change as trivial here — this tree always runs to the end so
			the reviewer can see each principle's findings, even if
			empty.
		`);
		evaluate(`${diffSummary} is set`);
	});

	parallel("Audit_Principles", () => {
		action("Single_Responsibility", () => {
			instruct(`
				Review the diff for single-responsibility violations.
				Flag any unit that does two distinct things, mixes
				business logic with I/O (file/network/clock), or uses
				"manager" / "processor" / "handler" naming that hints at
				absorbed responsibilities. Flag function or class names
				that contain "and". Return a JSON array of {file,
				line_range, description, suggested_split} objects (empty
				array if none) and store at
				${findingsSingleResponsibility}.
			`);
			evaluate(`${findingsSingleResponsibility} is set`);
		});

		action("Loose_Coupling", () => {
			instruct(`
				Review the diff for loose-coupling violations. Flag any
				class that instantiates a concrete dependency with
				\`new ConcreteService()\` instead of accepting it via
				constructor/parameter, missing interfaces between
				high-level logic and infrastructure (DB, HTTP,
				filesystem, clock), and any new shared mutable state or
				reach-ins to another module's private state. Return a
				JSON array of {file, line_range, description,
				suggested_seam} objects (empty array if none) and store
				at ${findingsLooseCoupling}.
			`);
			evaluate(`${findingsLooseCoupling} is set`);
		});

		action("Testability", () => {
			instruct(`
				Review the diff for testability violations. Flag code
				that requires a real database, network, or filesystem to
				test, side effects sneaking into ostensibly pure
				functions, non-determinism (clock, randomness, env) not
				hidden behind seams, and tests that assert on private
				methods or rely on call order. Return a JSON array of
				{file, line_range, description, suggested_seam} objects
				(empty array if none) and store at ${findingsTestability}.
			`);
			evaluate(`${findingsTestability} is set`);
		});

		action("Naming_And_Comments", () => {
			instruct(`
				Review the diff for naming and comment violations. Flag
				names that do not reveal intent, cryptic abbreviations,
				Hungarian-style type encoding (e.g. \`strName\`,
				\`iCount\`), and comments that narrate what the code
				already says (the WHAT) rather than the WHY. Keep
				comments that explain business constraints or
				non-obvious decisions. Return a JSON array of {file,
				line_range, description, suggested_rename_or_removal}
				objects (empty array if none) and store at
				${findingsNaming}.
			`);
			evaluate(`${findingsNaming} is set`);
		});

		action("Open_To_Extension", () => {
			instruct(`
				Review the diff for openness-to-extension violations.
				Flag growing \`switch\` or \`if/else\` chains for each
				new case where polymorphism or a strategy pattern would
				serve, public interfaces that have been changed without
				a flag, and members that are public when they could be
				private. Return a JSON array of {file, line_range,
				description, suggested_pattern} objects (empty array if
				none) and store at ${findingsExtension}.
			`);
			evaluate(`${findingsExtension} is set`);
		});

		action("Done_Means_Checklist", () => {
			instruct(`
				Apply the "done means" checklist to the diff. For each
				bullet below, mark pass / fail / unverifiable and add a
				one-line note:
				- The stated task is satisfied — no more, no less.
				- New behavior has tests; existing tests still pass.
				- Lint and format checks pass.
				- The diff is focused: no unrelated edits, no
				  commented-out code, no debug prints.
				- A reviewer reading the diff cold would not need to ask
				  "why?" anywhere it isn't already answered.
				Do not run lint/test commands yourself — mark them
				unverifiable and assume CI covers them. Return a JSON
				array of {check, status, note} objects and store at
				${findingsDoneMeans}.
			`);
			evaluate(`${findingsDoneMeans} is set`);
		});
	});

	action("Consolidate_Report", () => {
		instruct(`
			Merge the six findings buckets into a single markdown
			report and store it at ${consolidatedReport}. Section
			structure (omit a section only if its array is empty):

			### Clean-code review

			**Summary.** ${diffSummary}

			**Single responsibility.** <items from
			${findingsSingleResponsibility}>

			**Loose coupling.** <items from ${findingsLooseCoupling}>

			**Testability.** <items from ${findingsTestability}>

			**Naming & comments.** <items from ${findingsNaming}>

			**Open to extension.** <items from ${findingsExtension}>

			**Done-means checklist.** <bullets from
			${findingsDoneMeans}, each as
			\`- [pass|fail|unverifiable] <check> — <note>\`>

			Cite every finding with a local \`path/to/file.ts:L12-L18\`
			reference, including at least one line of context before
			and after.
		`);
		evaluate(`${consolidatedReport} is set`);
	});

	action("Print_Report", () => {
		instruct(`
			Print ${consolidatedReport} verbatim to the user as the
			final output of the review.
		`);
	});
});
