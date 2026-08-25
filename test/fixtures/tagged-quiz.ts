/**
 * Options as a name and a few tags, so a test declares the smallest quiz its
 * behaviour needs rather than bending a realistic one into that shape.
 */

import {
	describe,
	type Axis,
	type Question,
	type Quiz,
} from "../../src/quiz/engine";

/** All a question ever reads off an option, the shape being the subject here. */
export type Tagged = { slug: string; tags: readonly string[] };

type Keep = (one: Tagged) => boolean;

export const tagged = (slug: string, ...tags: readonly string[]): Tagged => ({
	slug,
	tags,
});

export const has =
	(tag: string): Keep =>
	(one) =>
		one.tags.includes(tag);

export const lacks =
	(tag: string): Keep =>
	(one) =>
		!one.tags.includes(tag);

/** Answers in the order they are written, each labelled by its own id. */
export const question = (
	id: string,
	answers: Record<string, Keep>,
	rest: { kind?: "fact" | "preference"; asksFirst?: boolean } = {},
): Question<Tagged> => ({
	id,
	question: id,
	kind: "preference",
	...rest,
	answers: Object.entries(answers).map(([picked, keep]) => ({
		id: picked,
		label: picked,
		keep,
	})),
});

export const quizOf = (
	options: readonly Tagged[],
	questions: readonly Question<Tagged>[],
	worseThan?: Quiz<Tagged>["worseThan"],
): Quiz<Tagged> => ({ options, questions, worseThan });

/**
 * A card read off the tags: one axis each, praising the options carrying it and
 * marking down the ones that do not, so every card has a con to refuse.
 */
export const traitsFor =
	(...tags: readonly string[]) =>
	(one: Tagged) =>
		describe(
			one,
			tags.map((tag): Axis<Tagged> => ({
				id: tag,
				holds: has(tag),
				pro: tag,
				con: `not ${tag}`,
			})),
		);
