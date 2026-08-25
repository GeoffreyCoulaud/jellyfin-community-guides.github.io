/** What the quiz has to show for the answers so far. */

import { describe, expect, it } from "vitest";
import { resolve, startQuiz } from "../../../src/quiz/engine";
import { answered } from "../../fixtures/answering";
import {
	has,
	lacks,
	question,
	quizOf,
	tagged,
} from "../../fixtures/tagged-quiz";

/** Two nothing tells apart, and one on its own. */
const options = [tagged("a", "hot", "sweet"), tagged("b", "hot"), tagged("c")];

const temperature = question("temperature", {
	hot: has("hot"),
	cold: lacks("hot"),
});

const sweetness = question("sweetness", {
	sweet: has("sweet"),
	plain: lacks("sweet"),
});

const quiz = quizOf(options, [temperature, sweetness]);

describe("resolve", () => {
	it("is still asking while a question tells the pool apart", () => {
		// given a quiz nobody has answered
		// when the outcome is read
		const outcome = resolve(quiz, startQuiz(quiz));

		// then there is nothing to show yet
		expect(outcome).toEqual({ status: "asking" });
	});

	it("resolves on the one option left standing", () => {
		// given answers ruling everything else out
		const state = answered(quiz, ["temperature", "cold"]);

		// when the outcome is read
		const outcome = resolve(quiz, state);

		// then it is a recommendation, with nothing else to weigh
		expect(outcome).toMatchObject({
			status: "resolved",
			option: { slug: "c" },
			alternatives: [],
		});
	});

	it("puts what no question tells apart behind the recommendation", () => {
		// given a pool no remaining question separates
		const half = quizOf(
			[tagged("a", "hot"), tagged("b", "hot")],
			[temperature],
		);

		// when the outcome is read
		const outcome = resolve(half, startQuiz(half));

		// then the first declared leads, the other coming as an alternative
		expect(outcome).toMatchObject({
			status: "resolved",
			option: { slug: "a" },
			alternatives: [{ slug: "b" }],
		});
	});

	it("is over-constrained once the answers rule everything out", () => {
		// given two answers no option satisfies at once
		const state = answered(
			quiz,
			["temperature", "cold"],
			["sweetness", "sweet"],
		);

		// when the outcome is read
		const outcome = resolve(quiz, state);

		// then the honest answer is that there is nothing to recommend
		expect(outcome).toEqual({ status: "over-constrained" });
	});
});
