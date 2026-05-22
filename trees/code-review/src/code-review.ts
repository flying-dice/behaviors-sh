import {
	action,
	evaluate,
	instruct,
	parallel,
	selector,
	sequence,
	variable,
} from "@behaviors-sh/dsl";

export const codeReview = sequence("Code_Review", (node) => {
	node.version = "0.1.0";
	node.description =
		"Review uncommitted changes (staged + unstaged) in the working tree: gate on triviality, gather CLAUDE.md context, run five parallel reviewers, score each issue, filter low confidence, and print a final report.";

	const reviewWarranted = variable("review_warranted", null);
	const skipReason = variable("skip_reason", null);
	const claudeMdPaths = variable("claude_md_paths", null);
	const changeSummary = variable("change_summary", null);

	const issuesClaudeMd = variable("issues_claude_md", null);
	const issuesBugs = variable("issues_bugs", null);
	const issuesHistory = variable("issues_history", null);
	const issuesRecentNotes = variable("issues_recent_notes", null);
	const issuesComments = variable("issues_comments", null);

	const scoredIssues = variable("scored_issues", null);
	const filteredIssues = variable("filtered_issues", null);

	action("Gate_On_Triviality", () => {
		instruct(`
			Use a Haiku agent to run \`git status\` and \`git diff HEAD\`
			and decide whether a review is warranted. Skip if any of these
			is true: (a) there are no changes, (b) the change is purely
			cosmetic (whitespace, formatting), (c) it is an automated
			change (lockfile bump only, generated file), or (d) it is
			trivial (a one-line typo fix). Write a boolean to
			${reviewWarranted}. If skipping, write a one-sentence reason
			to ${skipReason}; otherwise write null to ${skipReason}.
		`);
		evaluate(`${reviewWarranted} is set`);
	});

	selector("Proceed_Or_Skip", () => {
		action("Skip_Review", () => {
			evaluate(`${reviewWarranted} is false`);
			instruct(`
				Tell the user that no review was performed and surface
				${skipReason} verbatim as the reason. Then stop — do not
				drive the rest of the tree.
			`);
		});

		sequence("Run_Review", () => {
			action("Gate_Proceed", () => {
				evaluate(`${reviewWarranted} is true`);
				instruct(`
					Proceed with the review. No-op placeholder — the gate
					alone fails the selector branch if the review is not
					warranted.
				`);
			});

			action("Collect_Claude_Md_Paths", () => {
				instruct(`
					Use a Haiku agent to return a list of file paths to
					(but not the contents of) any relevant CLAUDE.md files:
					the root CLAUDE.md (if one exists) and any CLAUDE.md
					files in the directories whose files were modified.
					Store the list as JSON at ${claudeMdPaths}.
				`);
				evaluate(`${claudeMdPaths} is set`);
			});

			action("Summarize_Change", () => {
				instruct(`
					Use a Haiku agent to read the diff and return a concise
					summary of the change (what is being modified and
					roughly why, in 2-4 sentences). Store the summary at
					${changeSummary}.
				`);
				evaluate(`${changeSummary} is set`);
			});

			parallel("Five_Reviewers", () => {
				action("Audit_Claude_Md_Compliance", () => {
					instruct(`
						Agent #1. Audit the changes for compliance with the
						CLAUDE.md files listed at ${claudeMdPaths}. Note
						that CLAUDE.md is guidance for Claude as it writes
						code, so not all instructions will be applicable
						during review. Return a JSON list of
						{description, reason, path_line_range} objects and
						write it to ${issuesClaudeMd}. Reason must cite
						the specific CLAUDE.md clause.
					`);
					evaluate(`${issuesClaudeMd} is set`);
				});

				action("Scan_For_Obvious_Bugs", () => {
					instruct(`
						Agent #2. Read the file changes and shallow-scan
						for obvious bugs. Stay inside the changes; focus on
						large bugs and avoid small issues and nitpicks.
						Ignore likely false positives (pre-existing issues,
						things a linter/typechecker/compiler would catch).
						Return a JSON list of {description, reason,
						path_line_range} objects and write it to
						${issuesBugs}.
					`);
					evaluate(`${issuesBugs} is set`);
				});

				action("Cross_Reference_History", () => {
					instruct(`
						Agent #3. Read \`git blame\` and \`git log -p\` on
						the modified lines to identify bugs in light of
						historical context — e.g., the change silently
						reverts a prior fix. Return a JSON list of
						{description, reason, path_line_range} objects
						(reason should cite the relevant commit) and write
						it to ${issuesHistory}.
					`);
					evaluate(`${issuesHistory} is set`);
				});

				action("Check_Recent_Commits_And_Notes", () => {
					instruct(`
						Agent #4. Read recent commits that touched the
						changed files (\`git log --oneline -n 30 -- <files>\`)
						and any in-tree notes (TODO, FIXME, NOTE) near the
						modified lines. Check whether prior guidance
						applies to the current change. Return a JSON list
						of {description, reason, path_line_range} objects
						and write it to ${issuesRecentNotes}.
					`);
					evaluate(`${issuesRecentNotes} is set`);
				});

				action("Check_Inline_Comments", () => {
					instruct(`
						Agent #5. Read code comments in the modified files
						and ensure the change complies with any guidance in
						the comments. Return a JSON list of {description,
						reason, path_line_range} objects and write it to
						${issuesComments}.
					`);
					evaluate(`${issuesComments} is set`);
				});
			});

			action("Score_Issues", () => {
				instruct(`
					Concatenate the issue lists from ${issuesClaudeMd},
					${issuesBugs}, ${issuesHistory}, ${issuesRecentNotes},
					and ${issuesComments}. For each issue, launch a
					parallel Haiku agent that takes the diff, the issue
					description, and the list of CLAUDE.md files from
					${claudeMdPaths}, and returns a confidence score from
					0-100. For issues flagged due to CLAUDE.md, the agent
					must double-check that the CLAUDE.md actually calls
					out that issue specifically. Use this rubric verbatim:
					0 = not confident at all (false positive or pre-existing);
					25 = somewhat confident, could be a false positive;
					50 = moderately confident, real but possibly a nitpick;
					75 = highly confident, double-checked and likely to be
					hit in practice;
					100 = absolutely certain, confirmed real and frequent.
					Store the augmented JSON list (each item now carries a
					\`score\`) at ${scoredIssues}.
				`);
				evaluate(`${scoredIssues} is set`);
			});

			action("Filter_By_Confidence", () => {
				instruct(`
					Filter ${scoredIssues}, dropping any item with
					\`score\` < 80. Store the filtered list at
					${filteredIssues}.
				`);
				evaluate(`${filteredIssues} is set`);
			});

			action("Print_Report", () => {
				instruct(`
					Print the review to the user as markdown using the
					format below. Be brief. Cite each issue with a local
					path:line reference (e.g. \`src/foo/bar.ts:L12-L18\`,
					with at least one line of context before and after the
					cited line). No emojis. If ${filteredIssues} is empty,
					print:

					### Code review

					No issues found. Checked for bugs and CLAUDE.md
					compliance.

					Otherwise print:

					### Code review

					Found N issues:

					1. <brief description> (CLAUDE.md says "<...>" or
					evidence)

					\`path/to/file.ts:L12-L18\`

					...

					Do not run build, test, or typecheck commands — assume
					CI covers them.
				`);
			});
		});
	});
});
