/** Options plainly worse than another, and when the quiz may let them go. */

import { describe, expect, it } from "vitest";
import { keepAll, startQuiz } from "../../../src/quiz/engine";
import { answered, pool } from "../../fixtures/answering";
import {
	has,
	lacks,
	question,
	quizOf,
	tagged,
	type Tagged,
} from "../../fixtures/tagged-quiz";

/** A free plan and a paid one, what they are worth being the difference. */
const plans = [tagged("free"), tagged("paid", "paid", "roomy")];

/** Paying for what the free plan of the same service already covers. */
const worseThan = (candidate: Tagged, other: Tagged) =>
	has("paid")(candidate) && lacks("paid")(other);

/** Its paying answer keeps the paid plan, and only it. */
const budget = question("budget", {
	paying: has("paid"),
	free: lacks("paid"),
	"no-preference": keepAll,
});

/** Nothing in here tells the two plans apart. */
const colour = question("colour", { any: keepAll });

describe("pruning", () => {
	it("keeps an outclassed option while a question can still favour it", () => {
		// given a question with an answer only the paid plan survives
		const quiz = quizOf(plans, [budget], worseThan);

		// when the quiz starts
		const state = startQuiz(quiz);

		// then the paid plan stays: the judgement is not the timing of it
		expect(pool(state)).toEqual(["free", "paid"]);
	});

	it("lets it go as soon as nothing left to ask can favour it", () => {
		// given that question answered in a way that keeps both
		const quiz = quizOf(plans, [budget], worseThan);

		// when the answer is applied
		const state = answered(quiz, ["budget", "no-preference"]);

		// then the paid plan goes, rather than waiting for the last question
		expect(pool(state)).toEqual(["free"]);
	});

	it("lets it go before the first question where none can favour it", () => {
		// given a quiz asking nothing that tells the two plans apart
		const quiz = quizOf(plans, [colour], worseThan);

		// when the quiz starts
		const state = startQuiz(quiz);

		// then the paid plan is gone from the off
		expect(pool(state)).toEqual(["free"]);
	});

	it("keeps it when it is all that is left", () => {
		// given the answer that rules the free plan out
		const quiz = quizOf(plans, [budget], worseThan);

		// when it is applied
		const state = answered(quiz, ["budget", "paying"]);

		// then the paid plan stands: nothing is left to outclass it
		expect(pool(state)).toEqual(["paid"]);
	});

	it("outclasses nothing where the quiz weighs no option against another", () => {
		// given the same quiz, with nothing said about what is worse
		const quiz = quizOf(plans, [budget]);

		// when the question is answered in a way that keeps both
		const state = answered(quiz, ["budget", "no-preference"]);

		// then both stand, and it is the reader who picks
		expect(pool(state)).toEqual(["free", "paid"]);
	});
});
