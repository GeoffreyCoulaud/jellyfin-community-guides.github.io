/** Answers as URL params, one per question: `?question-id=answer-id`. */

import { type Option, type Quiz, type QuizState, restore } from "./engine";

export const encodeAnswers = <O extends Option>(state: QuizState<O>) =>
	new URLSearchParams(
		state.answers.map(({ question, answer }) => [question.id, answer.id]),
	);

/** Undefined when any param is unknown or repeated, or the answers leave nothing. */
export const decodeAnswers = <O extends Option>(
	quiz: Quiz<O>,
	params: URLSearchParams,
): QuizState<O> | undefined => {
	const entries = [...params];
	const answers = entries.flatMap(([questionId, answerId]) => {
		const question = quiz.questions.find((one) => one.id === questionId);
		const answer = question?.answers.find((one) => one.id === answerId);
		return question === undefined || answer === undefined
			? []
			: [{ question, answer }];
	});
	const questionIds = new Set(entries.map(([questionId]) => questionId));

	if (
		answers.length !== entries.length ||
		questionIds.size !== entries.length
	) {
		return undefined;
	}

	const state = restore(quiz, answers);
	return state.pool.length > 0 ? state : undefined;
};
