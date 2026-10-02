import { describe, expect, it } from "vitest";
import { startQuiz } from "../../../src/quiz/engine";
import { decodeAnswers, encodeAnswers } from "../../../src/quiz/share";
import {
	answered,
	has,
	lacks,
	question,
	quizOf,
	tagged,
} from "../../fixtures/tagged-quiz";

const quiz = quizOf(
	[
		tagged("coffee", "hot", "caffeine"),
		tagged("tea", "hot"),
		tagged("lemonade"),
	],
	[
		question("temperature", { hot: has("hot"), cold: lacks("hot") }),
		question("caffeine", { yes: has("caffeine"), no: lacks("caffeine") }),
	],
);

const decode = (search: string) =>
	decodeAnswers(quiz, new URLSearchParams(search));

describe("encodeAnswers", () => {
	it("writes one param per answer, in the order given", () => {
		const state = answered(quiz, ["caffeine", "no"], ["temperature", "hot"]);

		expect(encodeAnswers(state).toString()).toBe("caffeine=no&temperature=hot");
	});

	it("writes nothing before any answer", () => {
		expect(encodeAnswers(startQuiz(quiz)).toString()).toBe("");
	});
});

describe("decodeAnswers", () => {
	it("restores the answers it encoded", () => {
		const state = answered(quiz, ["caffeine", "no"], ["temperature", "hot"]);

		expect(decodeAnswers(quiz, encodeAnswers(state))).toEqual(state);
	});

	it("rejects an unknown question", () => {
		expect(decode("size=large")).toBeUndefined();
	});

	it("rejects an unknown answer", () => {
		expect(decode("temperature=lukewarm")).toBeUndefined();
	});

	it("rejects a question answered twice", () => {
		expect(decode("temperature=hot&temperature=cold")).toBeUndefined();
	});

	it("rejects answers that rule every option out", () => {
		expect(decode("temperature=cold&caffeine=yes")).toBeUndefined();
	});
});
