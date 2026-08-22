/**
 * Options are described by properties, questions partition them: each answer
 * keeps the options matching it, so answering prunes the pool until a single
 * option is left.
 *
 * Question order is derived instead of hardcoded: a question is only asked
 * while its answers still split the remaining pool.
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
	 * A fact about the user, their network or what they are willing to put up
	 * with, rules options out, or none when the answer is the lucky one, so it
	 * cannot be counted on to narrow anything down.
	 * A preference always splits the pool: every answer is one side of it, and
	 * that is what makes the quiz land on a single option.
	 */
	kind: "fact" | "preference";
	answers: readonly Answer<O>[];
};

export type Quiz<O extends Option> = {
	options: readonly O[];
	questions: readonly Question<O>[];
};

/** An answer the user picked, kept so that the quiz can be replayed. */
export type Choice<O extends Option> = {
	question: Question<O>;
	answer: Answer<O>;
};

export type QuizState<O extends Option> = {
	pool: readonly O[];
	choices: readonly Choice<O>[];
};

export const keepAll = () => true;

const outcomes = <O extends Option>(
	question: Question<O>,
	pool: readonly O[],
) => question.answers.map((answer) => pool.filter(answer.keep));

/** How many options are left after the least helpful answer. */
const worstCase = <O extends Option>(
	question: Question<O>,
	pool: readonly O[],
) => Math.max(...outcomes(question, pool).map((left) => left.length));

/** Worth asking only while two answers lead to different, reachable pools. */
const splitsPool = <O extends Option>(
	question: Question<O>,
	pool: readonly O[],
) => {
	const reachable = outcomes(question, pool)
		.filter((left) => left.length > 0)
		.map((left) => left.map((option) => option.slug).join());
	return new Set(reachable).size >= 2;
};

export const startQuiz = <O extends Option>(quiz: Quiz<O>): QuizState<O> => ({
	pool: quiz.options,
	choices: [],
});

const wasAsked = <O extends Option>(state: QuizState<O>, id: string) =>
	state.choices.some((choice) => choice.question.id === id);

/**
 * Facts come first because they are not up for debate: nobody should weigh a
 * preference between options their network or their budget rules out anyway.
 * Sorting everything by worst case instead makes the quiz markedly shorter,
 * since preferences split the pool in two and facts often rule nothing out,
 * but it asks about HTTPS before asking whether a port can be opened. That
 * trade was measured and settled, so keep the two tiers.
 * Within a tier, the greedy pick: prunes the most in the worst case,
 * declaration order breaks ties.
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
				Number(a.kind === "preference") - Number(b.kind === "preference") ||
				worstCase(a, state.pool) - worstCase(b, state.pool),
		)
		.at(0);
};

export const applyAnswer = <O extends Option>(
	state: QuizState<O>,
	question: Question<O>,
	answer: Answer<O>,
): QuizState<O> => ({
	pool: state.pool.filter(answer.keep),
	choices: [...state.choices, { question, answer }],
});

/**
 * "over-constrained": every option is ruled out, so the honest answer is to
 * not set up remote access (or to walk back one answer).
 * "resolved": `alternatives` holds the options no remaining question can tell
 * apart from the recommended one, so declaration order picks the default.
 */
export const resolve = <O extends Option>(
	quiz: Quiz<O>,
	state: QuizState<O>,
) => {
	const [first, ...alternatives] = state.pool;
	if (first === undefined) return { status: "over-constrained" } as const;
	if (nextQuestion(quiz, state)) return { status: "asking" } as const;
	return { status: "resolved", option: first, alternatives } as const;
};

/**
 * No option satisfies both, so the user already ruled this answer out by
 * picking another one. Offering it back would read as a contradiction, unlike
 * an answer that is merely impossible once every other one is combined.
 */
const contradicts = <O extends Option>(
	quiz: Quiz<O>,
	state: QuizState<O>,
	tradeOff: Choice<O>,
) =>
	state.choices.some(
		(choice) =>
			!quiz.options.some(
				(option) => choice.answer.keep(option) && tradeOff.answer.keep(option),
			),
	);

/**
 * The quiz stops as soon as one option is left, so questions that would have
 * ruled it out are never asked. These are them: what the user is settling for
 * without having said so. Show them next to the result.
 */
export const tradeOffs = <O extends Option>(
	quiz: Quiz<O>,
	state: QuizState<O>,
	option: O,
): Choice<O>[] =>
	quiz.questions
		.filter((question) => !wasAsked(state, question.id))
		.flatMap((question) =>
			question.answers
				.filter((answer) => !answer.keep(option))
				.map((answer) => ({ question, answer })),
		)
		.filter((tradeOff) => !contradicts(quiz, state, tradeOff));

/**
 * Turn down a trade-off: the user's situation still holds, the contested answer
 * becomes a requirement, and preferences are weighed again on what is left.
 */
export const reconsider = <O extends Option>(
	quiz: Quiz<O>,
	state: QuizState<O>,
	tradeOff: Choice<O>,
): QuizState<O> => {
	const choices = [
		...state.choices.filter((choice) => choice.question.kind === "fact"),
		tradeOff,
	];
	return {
		pool: quiz.options.filter((option) =>
			choices.every((choice) => choice.answer.keep(option)),
		),
		choices,
	};
};

/**
 * Nothing is left, so at least one answer has to give. These are the ones that,
 * taken back on their own, would open the pool up again. An empty list means no
 * single answer is enough: two of them have to go.
 */
export const blockers = <O extends Option>(
	quiz: Quiz<O>,
	state: QuizState<O>,
): Choice<O>[] =>
	state.choices.filter((dropped) =>
		quiz.options.some((option) =>
			state.choices
				.filter((choice) => choice !== dropped)
				.every((choice) => choice.answer.keep(option)),
		),
	);
