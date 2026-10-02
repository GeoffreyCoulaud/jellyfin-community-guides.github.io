import { describe, expect, it } from "vitest";
import {
	isDeadEnd,
	matchesAll,
	nextQuestion,
	type Quiz,
	type QuizState,
	questionsLeft,
	resolve,
	rewind,
	startQuiz,
	traitsOf,
} from "../../../src/quiz/engine";
import {
	answered,
	axesFor,
	has,
	lacks,
	question,
	quizOf,
	slugs,
	type Tagged,
	tagged,
} from "../../fixtures/tagged-quiz";

const options = [
	tagged("a", "hot", "sweet", "rare", "early"),
	tagged("b", "hot", "early"),
	tagged("c", "sweet"),
	tagged("d"),
];

const temperature = question("temperature", {
	hot: has("hot"),
	cold: lacks("hot"),
});

const sweetness = question("sweetness", {
	sweet: has("sweet"),
	plain: lacks("sweet"),
});

const timing = question("timing", {
	early: has("early"),
	late: lacks("early"),
});

/** Leaves three options at worst, where the others leave two. */
const rarity = question("rarity", { rare: has("rare"), common: lacks("rare") });

const temperatureOrEither = question("temperature", {
	hot: has("hot"),
	cold: lacks("hot"),
	either: matchesAll,
});

describe("startQuiz", () => {
	it("starts with every option and no answer", () => {
		const state = startQuiz(quizOf(options, [temperature]));

		expect(slugs(state.pool)).toEqual(["a", "b", "c", "d"]);
		expect(state.answers).toEqual([]);
	});
});

describe("answering", () => {
	it("keeps the options matching the answer", () => {
		const quiz = quizOf(options, [temperature]);

		expect(slugs(answered(quiz, ["temperature", "hot"]).pool)).toEqual([
			"a",
			"b",
		]);
	});

	it("records the question and the answer", () => {
		const quiz = quizOf(options, [temperature]);
		const state = answered(quiz, ["temperature", "hot"]);

		expect(
			state.answers.map(({ question, answer }) => [question.id, answer.id]),
		).toEqual([["temperature", "hot"]]);
	});
});

describe("nextQuestion", () => {
	const asked = (quiz: Quiz<Tagged>, state: QuizState<Tagged>) =>
		nextQuestion(quiz, state)?.id;

	it("asks the question ruling out the most options in the worst case", () => {
		const quiz = quizOf(options, [rarity, temperature]);

		expect(asked(quiz, startQuiz(quiz))).toBe("temperature");
	});

	it("ignores answers that rule nothing out when comparing questions", () => {
		const quiz = quizOf(options, [rarity, temperatureOrEither]);

		expect(asked(quiz, startQuiz(quiz))).toBe("temperature");
	});

	it("breaks ties with the declaration order", () => {
		const quiz = quizOf(options, [sweetness, temperature]);

		expect(asked(quiz, startQuiz(quiz))).toBe("sweetness");
	});

	it("asks questions marked asksFirst before the others", () => {
		const pinned = question(
			"rarity",
			{ rare: has("rare"), common: lacks("rare") },
			true,
		);
		const quiz = quizOf(options, [temperature, pinned]);

		expect(asked(quiz, startQuiz(quiz))).toBe("rarity");
	});

	it("never asks the same question twice", () => {
		const quiz = quizOf(options, [temperatureOrEither, sweetness]);
		const state = answered(quiz, ["temperature", "either"]);

		expect(asked(quiz, state)).toBe("sweetness");
	});

	it("skips a question whose answers no longer split the pool", () => {
		const quiz = quizOf(options, [timing, temperature]);
		const state = answered(quiz, ["timing", "early"]);

		expect(asked(quiz, state)).toBeUndefined();
	});

	it("asks nothing once one option is left", () => {
		const quiz = quizOf(options, [temperature, sweetness]);
		const state = answered(
			quiz,
			["temperature", "hot"],
			["sweetness", "sweet"],
		);

		expect(asked(quiz, state)).toBeUndefined();
	});
});

describe("questionsLeft", () => {
	it("counts the questions that still split the pool", () => {
		const quiz = quizOf(options, [temperature, sweetness, timing]);

		expect(questionsLeft(quiz, startQuiz(quiz))).toBe(3);
		expect(questionsLeft(quiz, answered(quiz, ["timing", "early"]))).toBe(1);
	});
});

describe("isDeadEnd", () => {
	it("is true for an answer no option left matches", () => {
		const quiz = quizOf(options, [timing, temperature]);
		const state = answered(quiz, ["timing", "late"]);
		const deadEnds = temperature.answers.map((answer) =>
			isDeadEnd(answer, state.pool),
		);

		expect(deadEnds).toEqual([true, false]);
	});
});

describe("worseThan", () => {
	const plans = [tagged("free"), tagged("paid", "paid", "roomy")];
	const worseThan = (candidate: Tagged, other: Tagged) =>
		has("paid")(candidate) && lacks("paid")(other);
	const budget = question("budget", {
		paying: has("paid"),
		free: lacks("paid"),
		either: matchesAll,
	});

	it("keeps the worse option while a question could still favour it", () => {
		const quiz = quizOf(plans, [budget], { worseThan });

		expect(slugs(startQuiz(quiz).pool)).toEqual(["free", "paid"]);
	});

	it("drops it once no question left could favour it", () => {
		const quiz = quizOf(plans, [budget], { worseThan });

		expect(slugs(answered(quiz, ["budget", "either"]).pool)).toEqual(["free"]);
	});

	it("keeps it when it is the only one left", () => {
		const quiz = quizOf(plans, [budget], { worseThan });

		expect(slugs(answered(quiz, ["budget", "paying"]).pool)).toEqual(["paid"]);
	});
});

describe("resolve", () => {
	it("is asking while a question splits the pool", () => {
		const quiz = quizOf(options, [temperature]);

		expect(resolve(quiz, startQuiz(quiz)).status).toBe("asking");
	});

	it("is resolved once one option is left", () => {
		const quiz = quizOf(options, [temperature, sweetness]);
		const state = answered(
			quiz,
			["temperature", "hot"],
			["sweetness", "sweet"],
		);

		expect(resolve(quiz, state)).toEqual({
			status: "resolved",
			option: options[0],
		});
	});

	it("is undecided when no question tells the options left apart", () => {
		const quiz = quizOf(options, [temperature]);
		const state = answered(quiz, ["temperature", "hot"]);

		expect(resolve(quiz, state)).toEqual({
			status: "undecided",
			options: [options[0], options[1]],
		});
	});
});

describe("rewind", () => {
	it("drops the answer at that index and every later one", () => {
		const quiz = quizOf(options, [temperature, sweetness]);
		const state = answered(
			quiz,
			["temperature", "hot"],
			["sweetness", "sweet"],
		);
		const back = rewind(quiz, state, 1);

		expect(back.answers.map(({ question }) => question.id)).toEqual([
			"temperature",
		]);
		expect(slugs(back.pool)).toEqual(["a", "b"]);
	});

	it("goes back to the start at index 0", () => {
		const quiz = quizOf(options, [temperature]);
		const back = rewind(quiz, answered(quiz, ["temperature", "hot"]), 0);

		expect(back).toEqual(startQuiz(quiz));
	});
});

describe("traitsOf", () => {
	it("gives a pro where the axis holds and a con where it does not", () => {
		expect(traitsOf(tagged("x", "hot"), axesFor("hot", "sweet"))).toEqual([
			{ id: "hot", label: "hot", tone: "pro" },
			{ id: "sweet", label: "not sweet", tone: "con" },
		]);
	});

	it("says nothing for a side without a label", () => {
		const axes = [{ id: "hot", holds: has("hot"), con: "cold" }];

		expect(traitsOf(tagged("x", "hot"), axes)).toEqual([]);
	});

	it("skips an axis that does not apply to the option", () => {
		const axes = [
			{ id: "hot", applies: has("drink"), holds: has("hot"), pro: "hot" },
		];

		expect(traitsOf(tagged("x", "hot"), axes)).toEqual([]);
	});

	it("reads a label off the option when given a function", () => {
		const axes = [
			{ id: "name", holds: () => true, pro: (option: Tagged) => option.slug },
		];

		expect(traitsOf(tagged("x"), axes)).toEqual([
			{ id: "name", label: "x", tone: "pro" },
		]);
	});
});
