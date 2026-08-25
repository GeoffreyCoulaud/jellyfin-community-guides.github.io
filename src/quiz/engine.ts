/**
 * Options are described by properties, questions partition them: each answer
 * keeps the options matching it, so answering prunes the pool until one is
 * left. Order is derived, never hardcoded: a question is asked only while its
 * answers still split the pool.
 */

export type Option = { slug: string };

export type Answer<O extends Option> = {
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
	 * Nothing left to ask tells these apart, yet one is plainly worse: paying for
	 * what the free plan already covers. Dropped, not offered as just as good.
	 */
	worseThan?: (candidate: O, other: O) => boolean;
};

/**
 * Something the user told us: an answer, or a con they refused outright. Both
 * narrow the pool, which is all the engine needs from them.
 */
export type Step<O extends Option> = {
	/** The answer picked, or the con refused. */
	label: string;
	keep: (option: O) => boolean;
	/** The question answered. Absent when a con was refused instead. */
	question?: Question<O>;
};

/**
 * A plain fact about one option, pro or con, read off an `Axis` without knowing
 * what the user answered. A con keeps the predicate its axis tested, so calling
 * it a dealbreaker needs no question worded as its refusal.
 */
export type Trait<O extends Option> = {
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
			? [{ label, tone: "pro" }]
			: [{ label, tone: "con", keep: axis.holds }];
	});

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

export const startQuiz = <O extends Option>(quiz: Quiz<O>): QuizState<O> => ({
	pool: quiz.options,
	steps: [],
});

const wasAsked = <O extends Option>(state: QuizState<O>, id: string) =>
	state.steps.some((step) => step.question?.id === id);

/**
 * The greedy pick: prunes the most in the worst case, declaration order breaks
 * ties, `asksFirst` jumps the queue. No tier puts facts first: a question earns
 * its place by separating options, and what it never asks about is on the card
 * as a con, with a Dealbreaker button on it.
 */
export const nextQuestion = <O extends Option>(
	quiz: Quiz<O>,
	state: QuizState<O>,
) => {
	if (state.pool.length <= 1) return undefined;
	return quiz.questions
		.filter((q) => !wasAsked(state, q.id) && splitsPool(q, state.pool))
		.sort(
			(a, b) =>
				Number(b.asksFirst ?? false) - Number(a.asksFirst ?? false) ||
				worstCase(a, state.pool) - worstCase(b, state.pool),
		)
		.at(0);
};

/**
 * Answers still leading somewhere: offering one that empties the pool asks the
 * user to pick a dead end.
 */
export const liveAnswers = <O extends Option>(
	question: Question<O>,
	pool: readonly O[],
) => question.answers.filter((answer) => pool.some(answer.keep));

export const applyAnswer = <O extends Option>(
	state: QuizState<O>,
	question: Question<O>,
	answer: Answer<O>,
): QuizState<O> => ({
	pool: state.pool.filter(answer.keep),
	steps: [...state.steps, { label: answer.label, keep: answer.keep, question }],
});

/**
 * "over-constrained": every option is ruled out, so the honest answer is to set
 * none of this up, or to walk one answer back.
 * "resolved": `alternatives` holds what no remaining question tells apart from
 * the recommendation, declaration order picking which of them leads. The worse
 * deals drop out of both: nothing separates them any more, nothing excuses them.
 */
export const resolve = <O extends Option>(
	quiz: Quiz<O>,
	state: QuizState<O>,
) => {
	if (state.pool.length === 0) return { status: "over-constrained" } as const;
	if (nextQuestion(quiz, state)) return { status: "asking" } as const;
	const [first, ...alternatives] = state.pool.filter(
		(one) => !state.pool.some((other) => quiz.worseThan?.(one, other)),
	);
	if (first === undefined) return { status: "over-constrained" } as const;
	return { status: "resolved", option: first, alternatives } as const;
};

/** Steps only ever narrow the pool, so dropping one means replaying them all. */
const replay = <O extends Option>(
	quiz: Quiz<O>,
	steps: readonly Step<O>[],
): QuizState<O> => ({
	pool: quiz.options.filter((option) => steps.every((step) => step.keep(option))),
	steps,
});

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
