/** Nothing is left standing, so which answer has to give. */

import { describe, expect, it } from "vitest";
import {
	blockers,
	dropStep,
	reconsider,
	restore,
} from "../../../src/quiz/engine";
import { answered, labels, pool, refusal } from "../../fixtures/answering";
import {
	has,
	lacks,
	question,
	quizOf,
	tagged,
	traitsFor,
} from "../../fixtures/tagged-quiz";

/** One option per tag, and one carrying none: every card has a con to refuse. */
const bare = tagged("d");
const options = [
	tagged("a", "hot"),
	tagged("b", "strong"),
	tagged("c", "sweet"),
	bare,
];

const traits = traitsFor("hot", "strong", "sweet");

/** Facts, so nothing is weighed again when a con is refused. */
const questions = [
	question(
		"temperature",
		{ hot: has("hot"), cold: lacks("hot") },
		{ kind: "fact" },
	),
	question(
		"strength",
		{ strong: has("strong"), mild: lacks("strong") },
		{ kind: "fact" },
	),
	question(
		"sweetness",
		{ sweet: has("sweet"), plain: lacks("sweet") },
		{ kind: "fact" },
	),
];

const quiz = quizOf(options, questions);

/** Three facts leaving the bare option, then a refusal ruling it out too. */
const stuck = () => {
	const state = answered(
		quiz,
		["strength", "mild"],
		["temperature", "cold"],
		["sweetness", "plain"],
	);
	return reconsider(quiz, state, refusal(traits, bare, "hot"));
};

describe("blockers", () => {
	it("names the answers that on their own open the pool up again", () => {
		// given a dealbreaker leaving nothing standing
		const state = stuck();

		// when the answers in the way are named
		const blocking = blockers(quiz, state);

		// then it is the two that pull against each other
		expect(pool(state)).toEqual([]);
		expect(blocking.map((step) => step.label)).toEqual(["cold", "not hot"]);
	});

	it("leaves out the answers taking back would not help", () => {
		// given the same dead end
		const state = stuck();

		// when the answers in the way are named
		const blocking = blockers(quiz, state);

		// then the two nobody is stuck on are not offered
		expect(labels(state)).toContain("mild");
		expect(blocking.map((step) => step.label)).not.toContain("mild");
		expect(blocking.map((step) => step.label)).not.toContain("plain");
	});

	it("names nothing where two answers have to go", () => {
		// given an address carrying an answer and two dealbreakers, no two of
		// which any option satisfies together
		const answer = answered(quiz, ["sweetness", "sweet"]).steps;
		const state = restore(quiz, [
			...answer,
			refusal(traits, bare, "hot"),
			refusal(traits, bare, "strong"),
		]);

		// when the answers in the way are named
		// then there are none: taking one back is not enough
		expect(pool(state)).toEqual([]);
		expect(blockers(quiz, state)).toEqual([]);
	});
});

describe("dropStep", () => {
	it("takes back that answer, and replays the rest", () => {
		// given a dead end, and the answer to take back
		const state = stuck();
		const dropped = blockers(quiz, state)[0]!;

		// when it is taken back
		const back = dropStep(quiz, state, dropped);

		// then the others still hold, and what they keep is standing again
		expect(labels(back)).toEqual(["mild", "plain", "not hot"]);
		expect(pool(back)).toEqual(["a"]);
	});
});
