/** Which question comes next, and what answering one does to the pool. */

import { describe, expect, it } from "vitest";
import {
	deadAnswers,
	keepAll,
	liveAnswers,
	nextQuestion,
	questionsLeft,
	startQuiz,
	type Option,
	type Quiz,
	type QuizState,
} from "../../../src/quiz/engine";
import { answered, pool } from "../../fixtures/answering";
import {
	has,
	lacks,
	question,
	quizOf,
	tagged,
} from "../../fixtures/tagged-quiz";

/** Four options, three ways to split them down the middle, and one of a kind. */
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

const half = question("half", { early: has("early"), late: lacks("early") });

/** Leaves three standing at worst, where the others leave two. */
const rarity = question("rarity", { rare: has("rare"), common: lacks("rare") });

/** A question with a way out, which rules nothing out when it is taken. */
const openEnded = question("temperature", {
	hot: has("hot"),
	cold: lacks("hot"),
	either: keepAll,
});

const asked = <O extends Option>(quiz: Quiz<O>, state: QuizState<O>) =>
	nextQuestion(quiz, state)?.id;

describe("startQuiz", () => {
	it("starts with every option and nothing answered", () => {
		// given a quiz nobody has answered
		const quiz = quizOf(options, [temperature]);

		// when it starts
		const state = startQuiz(quiz);

		// then everything is still standing, and the recap is empty
		expect(pool(state)).toEqual(["a", "b", "c", "d"]);
		expect(state.steps).toEqual([]);
	});
});

describe("nextQuestion", () => {
	it("asks the question pruning the most in the worst case", () => {
		// given a question that can leave three standing, declared first
		const quiz = quizOf(options, [rarity, temperature]);

		// when the next question is picked
		// then the one leaving two behind wins, whatever the order
		expect(asked(quiz, startQuiz(quiz))).toBe("temperature");
	});

	it("judges a question on its answers that rule something out", () => {
		// given a question whose way out keeps everything, declared second
		const quiz = quizOf(options, [rarity, openEnded]);

		// when the next question is picked
		// then the way out is not held against it: what it does when answered
		// is what it is worth, and it leaves two behind where the other
		// leaves three
		expect(asked(quiz, startQuiz(quiz))).toBe("temperature");
	});

	it("breaks a tie on the order the questions are declared", () => {
		// given two questions splitting the pool down the middle
		const quiz = quizOf(options, [sweetness, temperature]);

		// when the next question is picked
		// then the first declared is asked
		expect(asked(quiz, startQuiz(quiz))).toBe("sweetness");
	});

	it("puts a question that asks first in front of one pruning more", () => {
		// given the question pruning the least, pinned to the front
		const pinned = question(
			"rarity",
			{ rare: has("rare"), common: lacks("rare") },
			{ asksFirst: true },
		);
		const quiz = quizOf(options, [temperature, pinned]);

		// when the next question is picked
		// then it jumps the queue
		expect(asked(quiz, startQuiz(quiz))).toBe("rarity");
	});

	it("never asks the same question twice", () => {
		// given a question answered the way that rules nothing out
		const quiz = quizOf(options, [openEnded, sweetness]);
		const state = answered(quiz, ["temperature", "either"]);

		// when the next question is picked
		// then another one is asked, though this one would still split the pool
		expect(pool(state)).toEqual(["a", "b", "c", "d"]);
		expect(asked(quiz, state)).toBe("sweetness");
	});

	it("skips a question the options still standing all answer alike", () => {
		// given a pool where nobody is served cold
		const quiz = quizOf(options, [half, temperature]);
		const state = answered(quiz, ["half", "early"]);

		// when the next question is picked
		// then nothing is asked: two are left, and no answer tells them apart
		expect(pool(state)).toEqual(["a", "b"]);
		expect(asked(quiz, state)).toBeUndefined();
	});

	it("skips a question whose answers all keep the same options", () => {
		// given a question worded two ways round the same thing
		const quiz = quizOf(options, [
			question("mood", { fine: keepAll, good: keepAll }),
		]);

		// when the next question is picked
		// then it is not asked: answering it would say nothing
		expect(asked(quiz, startQuiz(quiz))).toBeUndefined();
	});

	it("asks nothing once one option is left", () => {
		// given a pool down to one
		const quiz = quizOf(options, [rarity, temperature, sweetness]);
		const state = answered(quiz, ["rarity", "rare"]);

		// when the next question is picked
		// then there is nothing left to tell apart
		expect(pool(state)).toEqual(["a"]);
		expect(asked(quiz, state)).toBeUndefined();
	});

	it("asks nothing once the answers have ruled everything out", () => {
		// given two answers no option satisfies at once
		const quiz = quizOf(options, [temperature, rarity, sweetness]);
		const state = answered(
			quiz,
			["temperature", "cold"],
			["rarity", "rare"],
		);

		// when the next question is picked
		// then there is nobody left to ask about
		expect(pool(state)).toEqual([]);
		expect(asked(quiz, state)).toBeUndefined();
	});
});

describe("questionsLeft", () => {
	it("counts every question still worth asking", () => {
		// given a quiz nobody has answered
		const quiz = quizOf(options, [temperature, sweetness]);

		// when what is left to ask is counted
		// then both questions are ahead
		expect(questionsLeft(quiz, startQuiz(quiz))).toBe(2);
	});

	it("stops counting a question once it has been answered", () => {
		// given a quiz answered once
		const quiz = quizOf(options, [temperature, sweetness]);
		const state = answered(quiz, ["temperature", "hot"]);

		// when what is left to ask is counted
		// then only the unanswered one is ahead
		expect(questionsLeft(quiz, state)).toBe(1);
	});

	it("falls for an answer that ruled nothing out", () => {
		// given the way out of a question, taken
		const quiz = quizOf(options, [openEnded, sweetness]);
		const state = answered(quiz, ["temperature", "either"]);

		// when what is left to ask is counted
		// then it fell, though the pool did not: answering is progress too
		expect(pool(state)).toEqual(["a", "b", "c", "d"]);
		expect(questionsLeft(quiz, state)).toBe(1);
	});

	it("leaves out a question the options left all answer alike", () => {
		// given a pool where nobody is served cold
		const quiz = quizOf(options, [half, temperature]);
		const state = answered(quiz, ["half", "early"]);

		// when what is left to ask is counted
		// then nothing is: which is why the count is a ceiling, not a promise
		expect(questionsLeft(quiz, state)).toBe(0);
	});

	it("counts nothing once one option is left", () => {
		// given a pool down to one
		const quiz = quizOf(options, [rarity, temperature, sweetness]);
		const state = answered(quiz, ["rarity", "rare"]);

		// when what is left to ask is counted
		// then there is nothing left to tell apart
		expect(questionsLeft(quiz, state)).toBe(0);
	});

	it("counts nothing once the answers have ruled everything out", () => {
		// given two answers no option satisfies at once
		const quiz = quizOf(options, [temperature, rarity, sweetness]);
		const state = answered(
			quiz,
			["temperature", "cold"],
			["rarity", "rare"],
		);

		// when what is left to ask is counted
		// then there is nobody left to ask about
		expect(questionsLeft(quiz, state)).toBe(0);
	});
});

describe("liveAnswers", () => {
	it("offers only the answers still leading somewhere", () => {
		// given a pool where nobody is served cold
		const hot = options.filter(has("hot"));

		// when the answers are offered
		const offered = liveAnswers(openEnded, hot);

		// then the dead end is left out, the way out staying
		expect(offered.map((answer) => answer.id)).toEqual(["hot", "either"]);
	});

	it("keeps the answers in the order the question writes them", () => {
		// given a pool everything is still open on
		// when the answers are offered
		const offered = liveAnswers(openEnded, options);

		// then they read the way the question declares them
		expect(offered.map((answer) => answer.id)).toEqual([
			"hot",
			"cold",
			"either",
		]);
	});
});

describe("deadAnswers", () => {
	it("names the answers nothing left standing fits", () => {
		// given a pool where nobody is served cold
		const hot = options.filter(has("hot"));

		// when the answers with nothing behind them are named
		const named = deadAnswers(openEnded, hot);

		// then it is the dead end, the way out and the live answer left out
		expect(named.map((answer) => answer.id)).toEqual(["cold"]);
	});

	it("comes back empty while every answer still leads somewhere", () => {
		// given a pool everything is still open on
		// when the answers with nothing behind them are named
		// then there are none: the whole question is still there to pick from
		expect(deadAnswers(openEnded, options)).toEqual([]);
	});

	it("leaves the question whole, read against what it offers", () => {
		// given a pool where nobody is served cold
		const hot = options.filter(has("hot"));

		// when both sides are read
		const offered = liveAnswers(openEnded, hot);
		const named = deadAnswers(openEnded, hot);

		// then between them they account for every answer, and share none
		expect(offered.length + named.length).toBe(openEnded.answers.length);
		expect(offered.filter((answer) => named.includes(answer))).toEqual([]);
	});
});

describe("applyAnswer", () => {
	const quiz = quizOf(options, [temperature, sweetness]);

	it("records what was picked, under the question it answers", () => {
		// given a quiz nobody has answered
		// when an answer is applied
		const state = answered(quiz, ["temperature", "hot"]);

		// then the step names the answer, and what it answered
		expect(state.steps).toHaveLength(1);
		expect(state.steps[0]).toMatchObject({
			id: "hot",
			label: "hot",
			question: { id: "temperature" },
		});
	});

	it("narrows the pool to what the answer keeps", () => {
		// given a quiz nobody has answered
		// when an answer is applied
		const state = answered(quiz, ["temperature", "hot"]);

		// then what the answer rules out is gone
		expect(pool(state)).toEqual(["a", "b"]);
	});

	it("adds to the answers already given", () => {
		// given a quiz answered once
		// when a second answer is applied
		const state = answered(
			quiz,
			["temperature", "hot"],
			["sweetness", "sweet"],
		);

		// then the recap reads in the order they were given
		expect(state.steps.map((step) => step.id)).toEqual(["hot", "sweet"]);
		expect(pool(state)).toEqual(["a"]);
	});

	it("leaves the pool whole for an answer ruling nothing out", () => {
		// given the way out of a question, which takes no side
		const open = quizOf(options, [openEnded]);

		// when it is picked
		const state = answered(open, ["temperature", "either"]);

		// then everything is still standing
		expect(pool(state)).toEqual(["a", "b", "c", "d"]);
	});
});
