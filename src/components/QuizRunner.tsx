import { useState } from "react";
import {
	applyAnswer,
	blockers,
	dropChoice,
	liveAnswers,
	nextQuestion,
	reconsider,
	resolve,
	rewind,
	startQuiz,
	type Answer,
	type Choice,
	type Option,
	type Question,
	type Quiz,
	type QuizState,
	type Trait,
} from "../quiz/engine";
import "./quiz.css";

/** An option or an extra guide, as the page the user should end up reading. */
export type Doc = { title: string; href: string };

type Props<O extends Option> = {
	quiz: Quiz<O>;
	doc: (option: O) => Doc;
	guides?: (option: O) => Doc[];
	/** What the option is like, pros and cons, whatever the quiz asked. */
	traits?: (option: O) => Trait<O>[];
};

const key = <O extends Option>(choice: Choice<O>) =>
	`${choice.question.id}: ${choice.answer.label}`;

/** Help texts carry the odd address, which is only useful as a link. */
const linkify = (text: string) =>
	text.split(/(https?:\/\/\S+[^\s.,;:)])/).map((part, index) =>
		part.startsWith("http") ? (
			<a key={index} href={part}>
				{part.replace(/^https?:\/\//, "")}
			</a>
		) : (
			part
		),
	);

/** Facts hold, preferences get weighed again: worth knowing before answering. */
const Badge = <O extends Option>({ question }: { question: Question<O> }) => (
	<span className="quiz-badge">
		{question.kind === "fact" ? "Fact" : "Preference"}
	</span>
);

/** One answer, as a line of its question, so it reads without its context. */
const Line = <O extends Option>({ choice }: { choice: Choice<O> }) => (
	<>
		<span className="quiz-context">{choice.question.question}</span>
		<span className="quiz-value">{choice.answer.label}</span>
	</>
);

type ResultProps<O extends Option> = {
	quiz: Quiz<O>;
	state: QuizState<O>;
	option: O;
	alternatives: readonly O[];
	doc: (option: O) => Doc;
	guides?: (option: O) => Doc[];
	traits?: (option: O) => Trait<O>[];
	onDealbreaker: (dealbreaker: Choice<O>) => void;
};

const Result = <O extends Option>({
	quiz,
	state,
	option,
	alternatives,
	doc,
	guides,
	traits,
	onDealbreaker,
}: ResultProps<O>) => {
	const match = doc(option);
	const extra = guides?.(option) ?? [];
	const listed = traits?.(option) ?? [];
	const pros = listed.filter((trait) => trait.tone === "pro");
	const cons = listed.filter((trait) => trait.tone === "con");

	return (
		<section>
			<h2 className="quiz-title">{match.title}</h2>
			<p>
				<a className="quiz-cta" href={match.href}>
					Read the guide
				</a>
			</p>

			{alternatives.length > 0 && (
				<div className="quiz-block">
					<h3 className="quiz-heading">Just as good here</h3>
					<p className="quiz-note">
						Nothing left to ask tells these apart from {match.title}.
					</p>
					<ul className="quiz-links">
						{alternatives.map((other) => (
							<li key={other.slug}>
								<a href={doc(other).href}>{doc(other).title}</a>
							</li>
						))}
					</ul>
				</div>
			)}

			{listed.length > 0 && (
				<div className="quiz-block quiz-columns">
					<div>
						<h3 className="quiz-heading">Pros</h3>
						<ul className="quiz-traits">
							{pros.map((trait) => (
								<li className="quiz-pro" key={trait.label}>
									{trait.label}
								</li>
							))}
						</ul>
					</div>
					<div>
						<h3 className="quiz-heading">Cons</h3>
						<p className="quiz-note">
							One&rsquo;s a dealbreaker? Say so to rerun the quiz
						</p>
						<ul className="quiz-traits">
							{cons.map((trait) => (
								<li className="quiz-con" key={trait.label}>
									<span>{trait.label}</span>
									{trait.dealbreaker !== undefined && (
										<button
											type="button"
											onClick={() => onDealbreaker(trait.dealbreaker!)}
										>
											Dealbreaker
										</button>
									)}
								</li>
							))}
						</ul>
					</div>
				</div>
			)}

			{extra.length > 0 && (
				<div className="quiz-block">
					<h3 className="quiz-heading">You will also need</h3>
					<ul className="quiz-links">
						{extra.map((guide) => (
							<li key={guide.href}>
								<a href={guide.href}>{guide.title}</a>
							</li>
						))}
					</ul>
				</div>
			)}
		</section>
	);
};

export const QuizRunner = <O extends Option>({
	quiz,
	doc,
	guides,
	traits,
}: Props<O>) => {
	const [state, setState] = useState<QuizState<O>>(() => startQuiz(quiz));

	const answer = (question: Question<O>, picked: Answer<O>) =>
		setState(applyAnswer(state, question, picked));

	const recap = (
		<ol>
			{state.choices.map((choice, index) => (
				<li key={choice.question.id}>
					<button
						type="button"
						onClick={() => setState(rewind(quiz, state, index))}
					>
						<Badge question={choice.question} />
						<span className="quiz-recap-text">
							{choice.question.question} <strong>{choice.answer.label}</strong>
						</span>
						<span className="quiz-edit" aria-hidden="true">
							✎
						</span>
					</button>
				</li>
			))}
		</ol>
	);

	const question = nextQuestion(quiz, state);
	const outcome = resolve(quiz, state);
	const left = state.pool.length;

	return (
		<div className="quiz not-content">
			<p className="quiz-count">
				{left} option{left === 1 ? "" : "s"} left, out of {quiz.options.length}.
			</p>

			{question !== undefined && (
				<section>
					<h2 className="quiz-title">
						<Badge question={question} />
						{question.question}
					</h2>
					{question.help !== undefined && (
						<p className="quiz-note">{linkify(question.help)}</p>
					)}
					<ul className="quiz-answers">
						{liveAnswers(question, state.pool).map((picked) => (
							<li key={picked.label}>
								<button type="button" onClick={() => answer(question, picked)}>
									{picked.label}
								</button>
							</li>
						))}
					</ul>
				</section>
			)}

			{outcome.status === "resolved" && (
				<Result
					quiz={quiz}
					state={state}
					option={outcome.option}
					alternatives={outcome.alternatives}
					doc={doc}
					guides={guides}
					traits={traits}
					onDealbreaker={(dealbreaker) =>
						setState(reconsider(quiz, state, dealbreaker))
					}
				/>
			)}

			{outcome.status === "over-constrained" && (
				<section>
					<h2 className="quiz-title">Nothing does all of that</h2>
					{blockers(quiz, state).length > 0 ? (
						<>
							<p className="quiz-note">
								Take one of these answers back and the quiz carries on from
								there.
							</p>
							<ul className="quiz-swaps">
								{blockers(quiz, state).map((choice) => (
									<li key={key(choice)}>
										<button
											type="button"
											onClick={() => setState(dropChoice(quiz, state, choice))}
										>
											<Line choice={choice} />
										</button>
									</li>
								))}
							</ul>
						</>
					) : (
						<p className="quiz-note">
							No single answer is enough here: two of them have to go.
						</p>
					)}
				</section>
			)}

			{state.choices.length > 0 &&
				(question === undefined ? (
					<details className="quiz-recap">
						<summary>Your answers ({state.choices.length})</summary>
						{recap}
					</details>
				) : (
					<section className="quiz-recap">
						<h3 className="quiz-heading">Your answers</h3>
						{recap}
					</section>
				))}
		</div>
	);
};
