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
	 * Pinned to the front of the order. For the gate whose omission would put a
	 * plainly wrong option on the screen, which the greedy pick would otherwise
	 * leave for last and never reach. Keep this to the few that earn it.
	 */
	asksFirst?: boolean;
	/**
	 * A fact about the user or their network, not up for debate. A preference is
	 * what they would rather have. Order does not follow from this any more,
	 * every question is asked when it prunes the most: what it decides is
	 * `reconsider`, where the facts hold and the preferences are weighed again.
	 */
	kind: "fact" | "preference";
	answers: readonly Answer<O>[];
};

export type Quiz<O extends Option> = {
	options: readonly O[];
	questions: readonly Question<O>[];
	/**
	 * Nothing left to ask tells these two apart, yet one is plainly the worse
	 * deal: paying for what the free plan already covers. It is dropped from the
	 * alternatives rather than offered as just as good.
	 */
	worseThan?: (candidate: O, other: O) => boolean;
};

/** An answer the user picked, kept so that the quiz can be replayed. */
export type Choice<O extends Option> = {
	question: Question<O>;
	answer: Answer<O>;
};

/**
 * A plain fact about one option, pro or con, written without knowing what the
 * user answered. A con carries the answer that would rule the option out, so
 * the screen can offer to treat it as a dealbreaker.
 */
export type Trait<O extends Option> = {
	label: string;
	tone: "pro" | "con";
	dealbreaker?: Choice<O>;
};

export type QuizState<O extends Option> = {
	pool: readonly O[];
	choices: readonly Choice<O>[];
};

export const keepAll = () => true;

export const pro = <O extends Option>(label: string): Trait<O> => ({
	label,
	tone: "pro",
});

export const con = <O extends Option>(
	label: string,
	dealbreaker?: Choice<O>,
): Trait<O> =>
	dealbreaker ? { label, tone: "con", dealbreaker } : { label, tone: "con" };

/** One axis with two faces: the option lands on the good one or the bad one. */
export const either = <O extends Option>(
	good: boolean,
	upside: string,
	downside: string,
	dealbreaker?: Choice<O>,
): Trait<O> => (good ? pro(upside) : con(downside, dealbreaker));

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
	choices: [],
});

const wasAsked = <O extends Option>(state: QuizState<O>, id: string) =>
	state.choices.some((choice) => choice.question.id === id);

/**
 * The greedy pick: prunes the most in the worst case, declaration order breaks
 * ties, and `asksFirst` jumps the queue. Facts used to come first, which read as
 * thorough but cost four questions a run, most of them ruling nothing out, and
 * kept asking how many people a plan has to serve long after the answer could
 * change anything. The price of dropping that tier is an opening question that
 * can be a preference, HTTPS before port forwarding. Measured, and accepted.
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
 * Answers still leading somewhere. Offering one that empties the pool asks the
 * user to pick a dead end, which is worse than not offering it: the question is
 * only on screen because some other answer does lead somewhere.
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
	choices: [...state.choices, { question, answer }],
});

/**
 * "over-constrained": every option is ruled out, so the honest answer is to
 * not set up remote access (or to walk back one answer).
 * "resolved": `alternatives` holds the options no remaining question can tell
 * apart from the recommended one, so declaration order picks the default. The
 * plainly worse deals drop out first, of the recommendation as much as of the
 * alternatives: nothing separates them any more, so nothing excuses them.
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

/** Answers only ever narrow the pool, so dropping one means replaying them all. */
const fromChoices = <O extends Option>(
	quiz: Quiz<O>,
	choices: readonly Choice<O>[],
): QuizState<O> => ({
	pool: quiz.options.filter((option) =>
		choices.every((choice) => choice.answer.keep(option)),
	),
	choices,
});

/**
 * Turn a con into a dealbreaker: the user's situation still holds, the answer
 * that rules it out becomes a requirement, and preferences are weighed again.
 */
export const reconsider = <O extends Option>(
	quiz: Quiz<O>,
	state: QuizState<O>,
	dealbreaker: Choice<O>,
): QuizState<O> =>
	fromChoices(quiz, [
		...state.choices.filter(
			(choice) =>
				choice.question.kind === "fact" &&
				// It answers that question now, so the old answer cannot stand
				choice.question.id !== dealbreaker.question.id,
		),
		dealbreaker,
	]);

/** Back to just before that answer, dropping it and everything after it. */
export const rewind = <O extends Option>(
	quiz: Quiz<O>,
	state: QuizState<O>,
	index: number,
): QuizState<O> => fromChoices(quiz, state.choices.slice(0, index));

/** Take one answer back, a blocker being the reason to. */
export const dropChoice = <O extends Option>(
	quiz: Quiz<O>,
	state: QuizState<O>,
	dropped: Choice<O>,
): QuizState<O> =>
	fromChoices(
		quiz,
		state.choices.filter((choice) => choice !== dropped),
	);

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
