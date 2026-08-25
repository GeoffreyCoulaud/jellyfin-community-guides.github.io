/**
 * Options are described by properties, questions partition them: each answer
 * keeps the options matching it, so answering prunes the pool until one is
 * left. Order is derived, never hardcoded: a question is asked only while its
 * answers still split the pool.
 */

export type Option = { slug: string };

export type Answer<O extends Option> = {
	/**
	 * What a shared link cites, so the wording is free to change under it. What
	 * the answer keeps is not: an answer that changes its mind needs a new id,
	 * or an old link comes back meaning something nobody said.
	 */
	id: string;
	label: string;
	/** Options kept when this answer is picked. */
	keep: (option: O) => boolean;
};

export type Question<O extends Option> = {
	id: string;
	question: string;
	/** Shown next to the question, for the ones nobody can answer as written. */
	help?: string;
	/**
	 * Pinned to the front. For the questions a later preference depends on: being
	 * asked where connections should arrive, before knowing whether a port can be
	 * opened, reads as a free choice when it is not one.
	 */
	asksFirst?: boolean;
	/**
	 * A fact about the user or their network, against a preference they could be
	 * talked out of. What it decides is `reconsider`: facts hold, preferences are
	 * weighed again.
	 */
	kind: "fact" | "preference";
	answers: readonly Answer<O>[];
};

export type Quiz<O extends Option> = {
	options: readonly O[];
	questions: readonly Question<O>[];
	/**
	 * Plainly worse than another option, with nothing left to weigh against it.
	 * Asked only once no remaining question could turn out in the candidate's
	 * favour, so it carries the judgement and never its timing.
	 */
	worseThan?: (candidate: O, other: O) => boolean;
};

/**
 * Something the user told us: an answer, or a con they refused outright. Both
 * narrow the pool, which is all the engine needs from them.
 */
export type Step<O extends Option> = {
	/** The answer picked, or the axis the refused con was read off. */
	id: string;
	/** The answer picked, or the con refused. */
	label: string;
	keep: (option: O) => boolean;
	/** The question answered. Absent when a con was refused instead. */
	question?: Question<O>;
	/** Whose card the con was read off. Absent when a question was answered. */
	option?: O;
};

/**
 * A plain fact about one option, pro or con, read off an `Axis` without knowing
 * what the user answered. A con keeps the predicate its axis tested, so calling
 * it a dealbreaker needs no question worded as its refusal.
 */
export type Trait<O extends Option> = {
	/** The axis it was read off, which is what a refusal is cited by. */
	id: string;
	label: string;
	tone: "pro" | "con";
	/** Options left standing once this con is a dealbreaker. */
	keep?: (option: O) => boolean;
};

export type QuizState<O extends Option> = {
	pool: readonly O[];
	steps: readonly Step<O>[];
};

export const keepAll = () => true;

/** A label reading off the option, for the ones carrying a number of their own. */
type Side<O extends Option> = string | ((option: O) => string);

/**
 * One property of the options, and what it is worth saying about the one being
 * recommended. `holds` picks the side: `pro` when the property holds of that
 * option, `con` when it does not. Refusing that con is asking for the options
 * where it does hold, so `holds` is the way out of the con as much as its test.
 * Leaving a side out says nothing, which is how a property only worth a word one
 * way round is written.
 */
export type Axis<O extends Option> = {
	/** What a refused con is cited by, the label being free to move under it. */
	id: string;
	/** Worth a word at all: an axis with nothing to say is left out of the list. */
	applies?: (option: O) => boolean;
	holds: (option: O) => boolean;
	pro?: Side<O>;
	con?: Side<O>;
};

const say = <O extends Option>(side: Side<O>, option: O) =>
	typeof side === "string" ? side : side(option);

/** Reads every axis against one option, the silent sides dropping out. */
export const describe = <O extends Option>(
	option: O,
	axes: readonly Axis<O>[],
): Trait<O>[] =>
	axes.flatMap((axis): Trait<O>[] => {
		if (axis.applies !== undefined && !axis.applies(option)) return [];
		const holds = axis.holds(option);
		const side = holds ? axis.pro : axis.con;
		if (side === undefined) return [];
		const label = say(side, option);
		return holds
			? [{ id: axis.id, label, tone: "pro" }]
			: [{ id: axis.id, label, tone: "con", keep: axis.holds }];
	});

/** Two cards saying the same thing: same axis, same side, same words. */
const worded = <O extends Option>(trait: Trait<O>) =>
	`${trait.id}/${trait.tone}/${trait.label}`;

export type Comparison<O extends Option> = {
	/** Worded the same on every card left, so it tells none of them apart. */
	shared: Trait<O>[];
	/** One entry per option, in pool order: what only that card says. */
	apart: { option: O; traits: Trait<O>[] }[];
};

/**
 * What the options left say alike, against what each says for itself. Said once
 * over the lot, a shared trait stops being read as a reason to pick one of
 * them; what is left on the cards is what there is to weigh, which is the whole
 * of the job once no question can narrow the pool further.
 */
export const compare = <O extends Option>(
	pool: readonly O[],
	traits: (option: O) => readonly Trait<O>[],
): Comparison<O> => {
	const cards = pool.map((option) => ({
		option,
		traits: [...traits(option)],
	}));
	const [first, ...rest] = cards;
	if (first === undefined) return { shared: [], apart: [] };
	const shared = first.traits.filter((trait) =>
		rest.every((card) =>
			card.traits.some((one) => worded(one) === worded(trait)),
		),
	);
	const alike = new Set(shared.map(worded));
	return {
		shared,
		apart: cards.map((card) => ({
			option: card.option,
			traits: card.traits.filter((trait) => !alike.has(worded(trait))),
		})),
	};
};

const outcomes = <O extends Option>(
	question: Question<O>,
	pool: readonly O[],
) => question.answers.map((answer) => pool.filter(answer.keep));

/** How many options are left after the least helpful answer. */
const worstCase = <O extends Option>(
	question: Question<O>,
	pool: readonly O[],
) => Math.max(...outcomes(question, pool).map((left) => left.length));

/** Two answers keeping the same options say the same thing. */
const signature = <O extends Option>(options: readonly O[]) =>
	options.map((option) => option.slug).join();

/** Worth asking only while two answers lead to different, reachable pools. */
const splitsPool = <O extends Option>(
	question: Question<O>,
	pool: readonly O[],
) => {
	const reachable = outcomes(question, pool)
		.filter((left) => left.length > 0)
		.map(signature);
	return new Set(reachable).size >= 2;
};

const wasAsked = <O extends Option>(steps: readonly Step<O>[], id: string) =>
	steps.some((step) => step.question?.id === id);

/**
 * Every answer keeping the candidate keeps this one too, so nothing left to ask
 * can turn out in the candidate's favour. What lets an outclassed option go as
 * soon as it is outclassed, rather than at the last question.
 */
const subsumes = <O extends Option>(
	quiz: Quiz<O>,
	steps: readonly Step<O>[],
	other: O,
	candidate: O,
) =>
	quiz.questions
		.filter((question) => !wasAsked(steps, question.id))
		.every((question) =>
			question.answers.every(
				(answer) => !answer.keep(candidate) || answer.keep(other),
			),
		);

/**
 * What the steps keep, minus what another option outclasses. One pool, so the
 * count, the list and the result cannot disagree on what is still standing.
 */
const prune = <O extends Option>(quiz: Quiz<O>, steps: readonly Step<O>[]) => {
	const kept = quiz.options.filter((option) =>
		steps.every((step) => step.keep(option)),
	);
	return kept.filter(
		(one) =>
			!kept.some(
				(other) =>
					quiz.worseThan?.(one, other) &&
					subsumes(quiz, steps, other, one),
			),
	);
};

/** Steps only ever narrow the pool, so dropping one means replaying them all. */
const replay = <O extends Option>(
	quiz: Quiz<O>,
	steps: readonly Step<O>[],
): QuizState<O> => ({ pool: prune(quiz, steps), steps });

export const startQuiz = <O extends Option>(quiz: Quiz<O>) => replay(quiz, []);

/** Unasked, and still telling the pool apart: what there is left to ask. */
const askable = <O extends Option>(quiz: Quiz<O>, state: QuizState<O>) =>
	state.pool.length <= 1
		? []
		: quiz.questions.filter(
				(q) =>
					!wasAsked(state.steps, q.id) && splitsPool(q, state.pool),
			);

/**
 * The greedy pick: prunes the most in the worst case, declaration order breaks
 * ties, `asksFirst` jumps the queue. No tier puts facts first: a question earns
 * its place by separating options, and what it never asks about is on the card
 * as a con, with a Dealbreaker button on it.
 */
export const nextQuestion = <O extends Option>(
	quiz: Quiz<O>,
	state: QuizState<O>,
) =>
	askable(quiz, state)
		.sort(
			(a, b) =>
				Number(b.asksFirst ?? false) - Number(a.asksFirst ?? false) ||
				worstCase(a, state.pool) - worstCase(b, state.pool),
		)
		.at(0);

/**
 * How many questions are still worth asking, which is a ceiling rather than a
 * count: an answer can settle a question nobody has been asked yet, so what is
 * left falls by one at least, often by more.
 */
export const questionsLeft = <O extends Option>(
	quiz: Quiz<O>,
	state: QuizState<O>,
) => askable(quiz, state).length;

/**
 * Answers still leading somewhere: offering one that empties the pool asks the
 * user to pick a dead end.
 */
export const liveAnswers = <O extends Option>(
	question: Question<O>,
	pool: readonly O[],
) => question.answers.filter((answer) => pool.some(answer.keep));

export const applyAnswer = <O extends Option>(
	quiz: Quiz<O>,
	state: QuizState<O>,
	question: Question<O>,
	answer: Answer<O>,
): QuizState<O> =>
	replay(quiz, [
		...state.steps,
		{ id: answer.id, label: answer.label, keep: answer.keep, question },
	]);

/**
 * "over-constrained": every option is ruled out, so the honest answer is to set
 * none of this up, or to walk one answer back.
 * "undecided": several are left and nothing is left to ask, so none of them
 * leads. Declaration order is an order, not a ranking: what would rank them is
 * exactly what the quiz ran out of questions to ask.
 */
export const resolve = <O extends Option>(
	quiz: Quiz<O>,
	state: QuizState<O>,
) => {
	if (nextQuestion(quiz, state)) return { status: "asking" } as const;
	const [first, ...rest] = state.pool;
	if (first === undefined) return { status: "over-constrained" } as const;
	if (rest.length === 0) return { status: "resolved", option: first } as const;
	return { status: "undecided", options: state.pool } as const;
};

/**
 * Turn a con into a dealbreaker: every option carrying it leaves for good, the
 * facts hold, the preferences are weighed again. Earlier dealbreakers stay.
 */
export const reconsider = <O extends Option>(
	quiz: Quiz<O>,
	state: QuizState<O>,
	refused: Step<O>,
): QuizState<O> =>
	replay(quiz, [
		...state.steps.filter((step) => step.question?.kind !== "preference"),
		refused,
	]);

/** Back to just before that step, dropping it and everything after it. */
export const rewind = <O extends Option>(
	quiz: Quiz<O>,
	state: QuizState<O>,
	index: number,
): QuizState<O> => replay(quiz, state.steps.slice(0, index));

/** Take one step back, a blocker being the reason to. */
export const dropStep = <O extends Option>(
	quiz: Quiz<O>,
	state: QuizState<O>,
	dropped: Step<O>,
): QuizState<O> =>
	replay(
		quiz,
		state.steps.filter((step) => step !== dropped),
	);

/**
 * Nothing is left, so a step has to give: the ones that, taken back on their
 * own, open the pool up again. Empty means two of them have to go.
 */
export const blockers = <O extends Option>(
	quiz: Quiz<O>,
	state: QuizState<O>,
): Step<O>[] =>
	state.steps.filter((dropped) =>
		quiz.options.some((option) =>
			state.steps
				.filter((step) => step !== dropped)
				.every((step) => step.keep(option)),
		),
	);

/** An earlier state, read off its steps rather than the clicks that made them. */
export const restore = <O extends Option>(
	quiz: Quiz<O>,
	steps: readonly Step<O>[],
): QuizState<O> => replay(quiz, steps);
