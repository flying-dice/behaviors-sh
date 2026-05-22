import {
	action,
	constant,
	evaluate,
	instruct,
	selector,
	sequence,
	variable,
} from "@behaviors-sh/dsl";

export const helloWorld = sequence("Hello_World", (node) => {
	node.version = "0.1.0";
	node.description =
		"Greet a user based on time of day. Demonstrates sequence, selector, and action primitives.";

	const timeOfDay = variable("time_of_day", null);
	const greeting = variable("greeting", null);
	const userName = constant(
		"user_name",
		'retrieve by running the shell command "whoami"',
	);
	const tone = constant("tone", "friendly");
	const language = constant("language", "english");

	action("Determine_Time", () => {
		instruct(`
			Check the system clock to get the current hour. Classify as:
			before 12:00 = "morning", 12:00-17:00 = "afternoon", after 17:00 = "evening".
			Store the classification string at ${timeOfDay}.
		`);
	});

	selector("Choose_Greeting", () => {
		action("Morning_Greeting", () => {
			evaluate(`${timeOfDay} is "morning"`);
			instruct(
				`Compose a cheerful morning greeting addressing ${userName} in ${language} with a ${tone} tone. Store at ${greeting}.`,
			);
		});
		action("Afternoon_Greeting", () => {
			evaluate(`${timeOfDay} is "afternoon"`);
			instruct(
				`Compose a warm afternoon greeting addressing ${userName} in ${language} with a ${tone} tone. Store at ${greeting}.`,
			);
		});
		action("Evening_Greeting", () => {
			evaluate(`${timeOfDay} is "evening"`);
			instruct(
				`Compose a relaxed evening greeting addressing ${userName} in ${language} with a ${tone} tone. Store at ${greeting}.`,
			);
		});
	});

	action("Announce_Greeting", () => {
		instruct(`
			Read ${greeting} from the execution state and print it verbatim
			to the human.
		`);
	});
});
