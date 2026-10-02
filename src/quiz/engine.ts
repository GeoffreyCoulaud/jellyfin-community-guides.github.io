/**
 * Each answer keeps the options it matches, so answering narrows the pool. The
 * next question is the one ruling out the most options in the worst case.
 */

/** A link to the page documenting something. */
export type Link = { title: string; href: string; icon?: string };

export type Option = Link & { slug: string };

export type Answer<O extends Option> = {
	/** Shared links cite it: changing what an answer matches needs a new id. */
	id: string;
	label: string;
	/** Whether the option is still a candidate once this answer is picked. */
	matches: (option: O) => boolean;
};

export type Question<O extends Option> = {
	id: string;
	question: string;
	help?: string;
	/** Asked before any question without it, whatever it rules out. */
	asksFirst?: boolean;
	/** Shown to the reader: a fact has a right answer, a preference does not. */
	kind: "fact" | "preference";
	answers: readonly Answer<O>[];
};

export type Trait = { id: string; label: string; tone: "pro" | "con" };

type Label<O extends Option> = string | ((option: O) => string);

/** One property of the options: a pro where it holds, a con where it does not. */
export type Axis<O extends Option> = {
	id: string;
	/** Absent: the axis concerns every option. */
	applies?: (option: O) => boolean;
	holds: (option: O) => boolean;
	/** Absent: nothing is said on that side. */
	pro?: Label<O>;
	con?: Label<O>;
};

export type Quiz<O extends Option> = {
	options: readonly O[];
	questions: readonly Question<O>[];
	axes: readonly Axis<O>[];
	/** Pages to read on top of the option's own, once it is picked. */
	nextReads?: (option: O) => readonly Link[];
	/** Dropped once no question left could favour the candidate over the other. */
	worseThan?: (candidate: O, other: O) => boolean;
};

export type Answered<O extends Option> = {
	question: Question<O>;
	answer: Answer<O>;
};

export type QuizState<O extends Option> = {
	pool: readonly O[];
	answers: readonly Answered<O>[];
};

export const matchesAll = () => true;

export const traitsOf = <O extends Option>(
	option: O,
	axes: readonly Axis<O>[],
): Trait[] =>
	axes.flatMap((axis): Trait[] => {
		if (axis.applies !== undefined && !axis.applies(option)) {
			return [];
		}

		const tone = axis.holds(option) ? "pro" : "con";
		const label = axis[tone];
		if (label === undefined) {
			return [];
		}

		return [
			{
				id: axis.id,
				label: typeof label === "string" ? label : label(option),
				tone,
			},
		];
	});

const wasAsked = <O extends Option>(
	answers: readonly Answered<O>[],
	question: Question<O>,
) => answers.some((answered) => answered.question.id === question.id);

/** Every answer matching the candidate matches the other too. */
const coversCandidate = <O extends Option>(
	quiz: Quiz<O>,
	answers: readonly Answered<O>[],
	candidate: O,
	other: O,
) =>
	quiz.questions
		.filter((question) => !wasAsked(answers, question))
		.every((question) =>
			question.answers.every(
				(answer) => !answer.matches(candidate) || answer.matches(other),
			),
		);

const poolAfter = <O extends Option>(
	quiz: Quiz<O>,
	answers: readonly Answered<O>[],
) => {
	const matching = quiz.options.filter((option) =>
		answers.every(({ answer }) => answer.matches(option)),
	);

	return matching.filter(
		(candidate) =>
			!matching.some(
				(other) =>
					quiz.worseThan?.(candidate, other) &&
					coversCandidate(quiz, answers, candidate, other),
			),
	);
};

export const restore = <O extends Option>(
	quiz: Quiz<O>,
	answers: readonly Answered<O>[],
): QuizState<O> => ({ pool: poolAfter(quiz, answers), answers });

export const startQuiz = <O extends Option>(quiz: Quiz<O>) => restore(quiz, []);

export const answerQuestion = <O extends Option>(
	quiz: Quiz<O>,
	state: QuizState<O>,
	question: Question<O>,
	answer: Answer<O>,
) => restore(quiz, [...state.answers, { question, answer }]);

/** Keeps the answers given before `index`, dropping that one and the rest. */
export const rewind = <O extends Option>(
	quiz: Quiz<O>,
	state: QuizState<O>,
	index: number,
) => restore(quiz, state.answers.slice(0, index));

export const isDeadEnd = <O extends Option>(
	answer: Answer<O>,
	pool: readonly O[],
) => !pool.some(answer.matches);

/** Worth asking while two answers lead to different, non-empty pools. */
const splitsPool = <O extends Option>(
	question: Question<O>,
	pool: readonly O[],
) => {
	const pools = question.answers
		.map((answer) => pool.filter(answer.matches))
		.filter((left) => left.length > 0)
		.map((left) => left.map((option) => option.slug).join());

	return new Set(pools).size >= 2;
};

/** Answers keeping the whole pool are left out, or every question would tie. */
const worstCase = <O extends Option>(
	question: Question<O>,
	pool: readonly O[],
) =>
	Math.max(
		...question.answers
			.map((answer) => pool.filter(answer.matches).length)
			.filter((left) => left < pool.length),
	);

const askable = <O extends Option>(quiz: Quiz<O>, state: QuizState<O>) => {
	if (state.pool.length <= 1) {
		return [];
	}

	return quiz.questions.filter(
		(question) =>
			!wasAsked(state.answers, question) && splitsPool(question, state.pool),
	);
};

/** Declaration order breaks ties. */
export const nextQuestion = <O extends Option>(
	quiz: Quiz<O>,
	state: QuizState<O>,
) =>
	askable(quiz, state)
		.toSorted(
			(one, other) =>
				Number(other.asksFirst ?? false) - Number(one.asksFirst ?? false) ||
				worstCase(one, state.pool) - worstCase(other, state.pool),
		)
		.at(0);

/** An upper bound: one answer can leave several questions with nothing to split. */
export const questionsLeft = <O extends Option>(
	quiz: Quiz<O>,
	state: QuizState<O>,
) => askable(quiz, state).length;

export const resolve = <O extends Option>(
	quiz: Quiz<O>,
	state: QuizState<O>,
) => {
	if (nextQuestion(quiz, state) !== undefined) {
		return { status: "asking" } as const;
	}

	if (state.pool.length === 1) {
		return { status: "resolved", option: state.pool[0] } as const;
	}

	return { status: "undecided", options: state.pool } as const;
};
