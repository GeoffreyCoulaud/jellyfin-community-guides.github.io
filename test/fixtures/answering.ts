/** Reaching a state the way the runner reaches one, and reading it back. */

import {
	applyAnswer,
	startQuiz,
	type Option,
	type Quiz,
	type QuizState,
	type Step,
	type Trait,
} from "../../src/quiz/engine";

/** What was asked, and what was picked, named the way the quiz names them. */
export type Picked = [asked: string, answer: string];

/** A state reached by answering, so nothing is built the runner cannot build. */
export const answered = <O extends Option>(
	quiz: Quiz<O>,
	...picked: readonly Picked[]
) =>
	picked.reduce((state: QuizState<O>, [asked, id]) => {
		const question = quiz.questions.find((one) => one.id === asked)!;
		const answer = question.answers.find((one) => one.id === id)!;
		return applyAnswer(quiz, state, question, answer);
	}, startQuiz(quiz));

/** A con refused off a card, the way the result screen refuses one. */
export const refusal = <O extends Option>(
	traits: (option: O) => readonly Trait<O>[],
	option: O,
	axis: string,
): Step<O> => {
	const con = traits(option).find(
		(trait) => trait.id === axis && trait.tone === "con",
	)!;
	return { id: con.id, label: con.label, keep: con.keep!, option };
};

/** What is left standing, by name. */
export const pool = <O extends Option>(state: QuizState<O> | undefined) =>
	state?.pool.map((one) => one.slug);

/** The recap, as the words it reads. */
export const labels = <O extends Option>(state: QuizState<O> | undefined) =>
	state?.steps.map((step) => step.label);
