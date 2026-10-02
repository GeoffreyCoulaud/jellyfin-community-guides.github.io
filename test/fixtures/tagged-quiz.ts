/** Tiny quizzes whose options are just tags, so each test declares only what it needs. */

import {
	type Axis,
	answerQuestion,
	type Question,
	type Quiz,
	startQuiz,
} from "../../src/quiz/engine";

export type Tagged = {
	slug: string;
	title: string;
	href: string;
	tags: readonly string[];
};

type Matches = (option: Tagged) => boolean;

export const tagged = (slug: string, ...tags: readonly string[]): Tagged => ({
	slug,
	title: slug,
	href: `/${slug}/`,
	tags,
});

export const has =
	(tag: string): Matches =>
	(option) =>
		option.tags.includes(tag);

export const lacks =
	(tag: string): Matches =>
	(option) =>
		!option.tags.includes(tag);

/** Each answer is labelled with its own id. */
export const question = (
	id: string,
	answers: Record<string, Matches>,
	asksFirst?: boolean,
): Question<Tagged> => ({
	id,
	question: id,
	kind: "preference",
	asksFirst,
	answers: Object.entries(answers).map(([answerId, matches]) => ({
		id: answerId,
		label: answerId,
		matches,
	})),
});

export const quizOf = (
	options: readonly Tagged[],
	questions: readonly Question<Tagged>[],
	rest: Partial<Pick<Quiz<Tagged>, "axes" | "worseThan">> = {},
): Quiz<Tagged> => ({ options, questions, axes: [], ...rest });

/** One axis per tag: a pro where the option has it, a con where it does not. */
export const axesFor = (...tags: readonly string[]): Axis<Tagged>[] =>
	tags.map((tag) => ({
		id: tag,
		holds: has(tag),
		pro: tag,
		con: `not ${tag}`,
	}));

/** The state reached by answering, as `[questionId, answerId]` pairs. */
export const answered = (
	quiz: Quiz<Tagged>,
	...picks: readonly [string, string][]
) =>
	picks.reduce((state, [questionId, answerId]) => {
		const asked = quiz.questions.find((one) => one.id === questionId);
		const answer = asked?.answers.find((one) => one.id === answerId);
		if (asked === undefined || answer === undefined) {
			throw new Error(`No answer ${questionId}=${answerId}`);
		}

		return answerQuestion(quiz, state, asked, answer);
	}, startQuiz(quiz));

export const slugs = (options: readonly Tagged[]) =>
	options.map((option) => option.slug);
