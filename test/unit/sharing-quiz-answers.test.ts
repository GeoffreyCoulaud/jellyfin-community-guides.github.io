/** Answers written into the address bar, and read back off it. */

import { describe, expect, it } from "vitest";
import {
	applyAnswer,
	startQuiz,
	type QuizState,
	type Step,
} from "../../src/quiz/engine";
import { decodeState, encodeState, type Cited } from "../../src/quiz/share";
import {
	drink,
	drinkTraits,
	drinksQuiz,
	type Drink,
} from "../fixtures/drinks-quiz";

const quiz = drinksQuiz;

/** A state reached the way the runner reaches one: by answering. */
const answered = (...picked: readonly [string, string][]) =>
	picked.reduce((state: QuizState<Drink>, [asked, id]) => {
		const question = quiz.questions.find((one) => one.id === asked)!;
		const answer = question.answers.find((one) => one.id === id)!;
		return applyAnswer(quiz, state, question, answer);
	}, startQuiz(quiz));

/** A con refused off a card, the way the result screen refuses one. */
const refusal = (slug: string, axis: string): Step<Drink> => {
	const one = drink(slug);
	const con = drinkTraits(one).find((trait) => trait.id === axis)!;
	return { id: con.id, label: con.label, keep: con.keep!, option: one };
};

const restored = (...cited: Cited[]) => decodeState(quiz, cited, drinkTraits);

const labels = (state: QuizState<Drink> | undefined) =>
	state?.steps.map((step) => step.label);

const pool = (state: QuizState<Drink> | undefined) =>
	state?.pool.map((one) => one.slug);

describe("encodeState", () => {
	it("names an answer by its question and its id", () => {
		// given a quiz answered once
		const state = answered(["temperature", "hot"]);

		// when the state is encoded
		const cited = encodeState(state);

		// then the param is the question, holding the answer
		expect(cited).toEqual([["temperature", "hot"]]);
	});

	it("keeps answers in the order they were given", () => {
		// given two questions answered, the second one first
		const state = answered(["caffeine", "no"], ["temperature", "hot"]);

		// when the state is encoded
		const cited = encodeState(state);

		// then the params follow the answering, not the quiz
		expect(cited).toEqual([
			["caffeine", "no"],
			["temperature", "hot"],
		]);
	});

	it("names a refused con by the card it was read off", () => {
		// given a con refused on the tea card
		const state: QuizState<Drink> = {
			pool: [],
			steps: [refusal("tea", "caffeine")],
		};

		// when the state is encoded
		const cited = encodeState(state);

		// then the param is the card, holding the axis
		expect(cited).toEqual([["_tea", "caffeine"]]);
	});

	it("writes nothing for a quiz nobody has answered", () => {
		// given a quiz just started
		const state = startQuiz(quiz);

		// when the state is encoded
		const cited = encodeState(state);

		// then there is nothing to put in the address
		expect(cited).toEqual([]);
	});

	it("gives up on a step the quiz cannot name", () => {
		// given a step belonging to neither a question nor a card
		const state: QuizState<Drink> = {
			pool: [],
			steps: [{ id: "made-up", label: "Made up", keep: () => true }],
		};

		// when the state is encoded
		const cited = encodeState(state);

		// then no address is offered, rather than a partial one
		expect(cited).toBeUndefined();
	});
});

describe("decodeState", () => {
	it("restores an answer, and what it leaves standing", () => {
		// given a param naming a question and one of its answers
		// when it is decoded
		const state = restored(["temperature", "hot"]);

		// then the answer is back, and so is the pruning it did
		expect(labels(state)).toEqual(["Hot"]);
		expect(pool(state)).toEqual(["coffee", "tea"]);
	});

	it("restores answers in the order the params come", () => {
		// given params in the order they were answered
		// when they are decoded
		const state = restored(["caffeine", "no"], ["temperature", "hot"]);

		// then the recap reads the same way round
		expect(labels(state)).toEqual(["No", "Hot"]);
	});

	it("restores a refused con off its card", () => {
		// given a param naming a card and an axis
		// when it is decoded
		const state = restored(["_tea", "caffeine"]);

		// then the con is back, worded as that card words it
		expect(labels(state)).toEqual(["Will not wake you up"]);
		expect(pool(state)).toEqual(["coffee"]);
	});

	it("refuses a param the quiz does not write", () => {
		// given an answer alongside somebody else's param
		// when they are decoded
		const state = restored(["temperature", "hot"], ["fbclid", "IwAR0abc"]);

		// then the whole link is refused, half a state being worse than none
		expect(state).toBeUndefined();
	});

	it("refuses an answer the question no longer offers", () => {
		// given a question this quiz knows, and an answer it does not
		// when it is decoded
		const state = restored(["temperature", "lukewarm"]);

		// then the link is refused
		expect(state).toBeUndefined();
	});

	it("refuses an axis that reads as a pro on that card", () => {
		// given a param naming the axis coffee is praised for
		// when it is decoded
		const state = restored(["_coffee", "caffeine"]);

		// then the link is refused: there is no way out of a pro
		expect(state).toBeUndefined();
	});

	it("refuses a refusal aimed at a pro carrying a way out", () => {
		// given a card describing itself with a pro that keeps a predicate
		const praised = () => [
			{
				id: "caffeine",
				label: "Wakes you up",
				tone: "pro" as const,
				keep: () => true,
			},
		];

		// when a param names that pro as a refusal
		const state = decodeState(quiz, [["_coffee", "caffeine"]], praised);

		// then it is refused: a dealbreaker is a con or nothing
		expect(state).toBeUndefined();
	});

	it("refuses one question answered twice", () => {
		// given two params naming the same question
		// when they are decoded
		const state = restored(["temperature", "hot"], ["temperature", "cold"]);

		// then the link is refused, the quiz never asking one twice
		expect(state).toBeUndefined();
	});

	it("has nothing to restore from an empty address", () => {
		// given no params at all
		// when they are decoded
		const state = restored();

		// then there is nothing to restore
		expect(state).toBeUndefined();
	});

	it("reads back what a real query string carries", () => {
		// given answers written into an address
		const cited = encodeState(
			answered(["temperature", "hot"], ["caffeine", "yes"]),
		)!;
		const query = new URLSearchParams(
			cited.map(([name, id]) => [name, id]),
		);

		// when the address is read back
		const state = decodeState(quiz, query, drinkTraits);

		// then the answers survive the trip, unescaped
		expect(query.toString()).toBe("temperature=hot&caffeine=yes");
		expect(labels(state)).toEqual(["Hot", "Yes"]);
	});
});
