/** Walking an answer back, and what the quiz makes of what is left. */

import { describe, expect, it } from "vitest";
import { reconsider, restore, rewind } from "../../../src/quiz/engine";
import { answered, labels, pool, refusal } from "../../fixtures/answering";
import {
	has,
	lacks,
	question,
	quizOf,
	tagged,
	traitsFor,
} from "../../fixtures/tagged-quiz";

const strong = tagged("a", "hot", "strong");
const mild = tagged("b", "hot");
const options = [
	strong,
	mild,
	tagged("c", "strong", "big"),
	tagged("d"),
	tagged("e", "hot", "strong", "big"),
];

const traits = traitsFor("hot", "strong", "big");

/** A fact nobody can talk you out of, and two preferences they could. */
const questions = [
	question(
		"temperature",
		{ hot: has("hot"), cold: lacks("hot") },
		{ kind: "fact" },
	),
	question("strength", { strong: has("strong"), soft: lacks("strong") }),
	question("size", { big: has("big"), small: lacks("big") }),
];

const quiz = quizOf(options, questions);

describe("rewind", () => {
	it("goes back to just before that answer, dropping what came after", () => {
		// given three answers
		const state = answered(
			quiz,
			["temperature", "hot"],
			["strength", "strong"],
			["size", "small"],
		);

		// when the quiz is wound back to the second
		const back = rewind(quiz, state, 1);

		// then only the first is left, and the pool with it
		expect(labels(back)).toEqual(["hot"]);
		expect(pool(back)).toEqual(["a", "b", "e"]);
	});

	it("goes back to the start at nought", () => {
		// given a quiz answered twice
		const state = answered(
			quiz,
			["temperature", "hot"],
			["strength", "strong"],
		);

		// when the quiz is wound back to the first answer
		const back = rewind(quiz, state, 0);

		// then nothing has been answered, and everything is standing
		expect(labels(back)).toEqual([]);
		expect(pool(back)).toEqual(["a", "b", "c", "d", "e"]);
	});
});

describe("reconsider", () => {
	it("holds the facts and weighs the preferences again", () => {
		// given a fact and two preferences, leaving one option standing
		const state = answered(
			quiz,
			["temperature", "hot"],
			["strength", "soft"],
			["size", "small"],
		);
		expect(pool(state)).toEqual(["b"]);

		// when a con on that option is refused
		const back = reconsider(quiz, state, refusal(traits, mild, "strong"));

		// then the fact holds, both preferences are gone, and the refusal rules
		expect(labels(back)).toEqual(["hot", "not strong"]);
		expect(pool(back)).toEqual(["a", "e"]);
	});

	it("keeps the dealbreakers already refused", () => {
		// given one con already refused
		const state = answered(quiz, ["temperature", "hot"], ["size", "small"]);
		const once = reconsider(quiz, state, refusal(traits, mild, "strong"));

		// when a con on what that left is refused too
		const twice = reconsider(quiz, once, refusal(traits, strong, "big"));

		// then both stand, and only what carries neither con is left
		expect(labels(twice)).toEqual(["hot", "not strong", "not big"]);
		expect(pool(twice)).toEqual(["e"]);
	});
});

describe("restore", () => {
	it("works out what is left standing from the steps alone", () => {
		// given a dealbreaker, and nothing else
		// when a state is read off it
		const state = restore(quiz, [refusal(traits, mild, "strong")]);

		// then the pool is what that step keeps, not what it was handed
		expect(pool(state)).toEqual(["a", "c", "e"]);
	});

	it("starts over from no steps at all", () => {
		// given nothing answered
		// when a state is read off it
		const state = restore(quiz, []);

		// then it is a quiz about to be taken
		expect(labels(state)).toEqual([]);
		expect(pool(state)).toEqual(["a", "b", "c", "d", "e"]);
	});
});
