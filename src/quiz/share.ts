/**
 * The state as an address: one param per question, named the way the quiz names
 * it, holding the id of the answer picked. Nothing is packed into a string, so
 * the address bar reads as a list of what was answered.
 */

import {
	restore,
	type Option,
	type Quiz,
	type QuizState,
	type Step,
	type Trait,
} from "./engine";

/** One param: what was asked, and what was picked. */
export type Cited = [name: string, picked: string];

/** The result card, as the list a refused con is picked from. */
type Traits<O extends Option> = (option: O) => readonly Trait<O>[];

/**
 * A refused con is named after the card it was read off, never after a
 * question, so an option and a question sharing a name stay apart.
 */
const REFUSED = "_";

const cite = <O extends Option>(step: Step<O>): Cited | undefined => {
	if (step.question !== undefined) return [step.question.id, step.id];
	if (step.option !== undefined) return [REFUSED + step.option.slug, step.id];
	return undefined;
};

const read = <O extends Option>(
	quiz: Quiz<O>,
	traits: Traits<O>,
	[name, picked]: Cited,
): Step<O> | undefined => {
	if (name.startsWith(REFUSED)) {
		const option = quiz.options.find((one) => REFUSED + one.slug === name);
		if (option === undefined) return undefined;
		const con = traits(option).find(
			(trait) => trait.id === picked && trait.tone === "con",
		);
		if (con?.keep === undefined) return undefined;
		return { id: con.id, label: con.label, keep: con.keep, option };
	}

	const question = quiz.questions.find((one) => one.id === name);
	const answer = question?.answers.find((one) => one.id === picked);
	if (question === undefined || answer === undefined) return undefined;
	return { id: answer.id, label: answer.label, keep: answer.keep, question };
};

/**
 * Nothing, rather than an address restoring something else: a step the quiz
 * cannot name is one a reader would have to guess at.
 */
export const encodeState = <O extends Option>(state: QuizState<O>) => {
	const cited = state.steps.map(cite).filter((one) => one !== undefined);
	return cited.length === state.steps.length ? cited : undefined;
};

/**
 * Reads back every param, in the order they come. One the quiz cannot name
 * fails the lot: a link half understood is worse than starting over, and what
 * a stray param is doing there is not for this to guess.
 */
export const decodeState = <O extends Option>(
	quiz: Quiz<O>,
	shared: Iterable<Cited>,
	traits: Traits<O> = () => [],
): QuizState<O> | undefined => {
	const cited = [...shared];
	if (cited.length === 0) return undefined;
	// One param per question, the quiz never asking one twice
	const names = cited.map(([name]) => name);
	if (new Set(names).size !== names.length) return undefined;
	const steps = cited.flatMap((one) => read(quiz, traits, one) ?? []);
	if (steps.length !== cited.length) return undefined;
	return restore(quiz, steps);
};
