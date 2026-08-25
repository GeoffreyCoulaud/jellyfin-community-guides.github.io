import { useState } from "react";
import {
	applyAnswer,
	blockers,
	dropStep,
	liveAnswers,
	nextQuestion,
	reconsider,
	resolve,
	rewind,
	startQuiz,
	type Answer,
	type Option,
	type Question,
	type Quiz,
	type QuizState,
	type Step,
	type Trait,
} from "../quiz/engine";
import type { Emblem as EmblemData } from "../icons/emblems";
import { Emblem } from "./Emblem";
import "./quiz.css";

/**
 * An option or an extra guide, as the page the user should end up reading. Two
 * options can name the same page, so the emblem travels with the option rather
 * than being looked up from where it points.
 */
export type Doc = { title: string; href: string; emblem?: EmblemData };

type Props<O extends Option> = {
	quiz: Quiz<O>;
	doc: (option: O) => Doc;
	guides?: (option: O) => Doc[];
	/** What the option is like, pros and cons, whatever the quiz asked. */
	traits?: (option: O) => Trait<O>[];
};

const key = <O extends Option>(step: Step<O>) =>
	`${step.question?.id ?? "dealbreaker"}: ${step.label}`;

/** Softest first: a preference gives before a refusal, a refusal before a fact. */
const givesFirst = <O extends Option>(step: Step<O>) =>
	step.question === undefined ? 1 : step.question.kind === "preference" ? 0 : 2;

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

const Badge = ({ children }: { children: string }) => (
	<span className="quiz-badge">{children}</span>
);

/** A page to go and read, behind the icon of whatever it documents. */
const DocLink = ({ doc }: { doc: Doc }) => (
	<a href={doc.href}>
		<Emblem emblem={doc.emblem} />
		{doc.title}
	</a>
);

/** One page under one name is one link, whatever points at it. */
const sameLink = (one: Doc, other: Doc) =>
	one.href === other.href && one.title === other.title;

/** Facts hold, preferences get weighed again: worth knowing before answering. */
const kindOf = <O extends Option>(question: Question<O> | undefined) =>
	question === undefined
		? "Dealbreaker"
		: question.kind === "fact"
			? "Fact"
			: "Preference";

/** A step as a row: what it was, and what kind of thing it was. */
const StepRow = <O extends Option>({ step }: { step: Step<O> }) => (
	<>
		<Badge>{kindOf(step.question)}</Badge>
		<span className="quiz-recap-text">
			{step.question !== undefined && `${step.question.question} `}
			<strong>{step.label}</strong>
		</span>
	</>
);

type ResultProps<O extends Option> = {
	option: O;
	alternatives: readonly O[];
	doc: (option: O) => Doc;
	guides?: (option: O) => Doc[];
	traits?: (option: O) => Trait<O>[];
	onDealbreaker: (refused: Step<O>) => void;
};

const Result = <O extends Option>({
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
	// Running one tool two ways is two options, and one page to send them to
	const others = alternatives
		.map(doc)
		.filter((other) => !sameLink(other, match))
		.filter(
			(other, index, all) =>
				all.findIndex((one) => sameLink(one, other)) === index,
		);
	const pros = listed.filter((trait) => trait.tone === "pro");
	const cons = listed.filter((trait) => trait.tone === "con");

	return (
		<section>
			<h2 className="quiz-title quiz-result-title">
				<Emblem emblem={match.emblem} size="title" withPips />
				{match.title}
			</h2>
			<p>
				<a className="quiz-cta" href={match.href}>
					Read the guide
				</a>
			</p>

			{others.length > 0 && (
				<div className="quiz-block">
					<h3 className="quiz-heading">Just as good here</h3>
					<p className="quiz-note">
						Nothing left to ask tells these apart from {match.title}.
					</p>
					<ul className="quiz-links">
						{others.map((other) => (
							<li key={`${other.href} ${other.title}`}>
								<DocLink doc={other} />
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
							{cons.map((trait) => {
								const refuse = trait.keep;
								return (
									<li className="quiz-con" key={trait.label}>
										<span>{trait.label}</span>
										{refuse !== undefined && (
											<button
												type="button"
												onClick={() =>
													onDealbreaker({ label: trait.label, keep: refuse })
												}
											>
												Dealbreaker
											</button>
										)}
									</li>
								);
							})}
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
								<DocLink doc={guide} />
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
			{state.steps.map((step, index) => (
				<li key={key(step)}>
					<button
						type="button"
						onClick={() => setState(rewind(quiz, state, index))}
					>
						<StepRow step={step} />
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
	const stuck =
		outcome.status === "over-constrained"
			? [...blockers(quiz, state)].sort((a, b) => givesFirst(a) - givesFirst(b))
			: [];

	return (
		<div className="quiz not-content">
			<p className="quiz-count">
				{left} option{left === 1 ? "" : "s"} left, out of {quiz.options.length}.
			</p>

			{question !== undefined && (
				<section>
					<h2 className="quiz-title">
						<Badge>{kindOf(question)}</Badge>
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
					option={outcome.option}
					alternatives={outcome.alternatives}
					doc={doc}
					guides={guides}
					traits={traits}
					onDealbreaker={(refused) => setState(reconsider(quiz, state, refused))}
				/>
			)}

			{outcome.status === "over-constrained" && (
				<section>
					<h2 className="quiz-title">Nothing does all of that</h2>
					{stuck.length > 0 ? (
						<>
							<p className="quiz-note">
								Take one back and it stops being a requirement. The question
								comes back only if it still tells options apart.
							</p>
							<ul className="quiz-swaps">
								{stuck.map((step) => (
									<li key={key(step)}>
										<button
											type="button"
											onClick={() => setState(dropStep(quiz, state, step))}
										>
											<StepRow step={step} />
											<span className="quiz-action">↺ Take back</span>
										</button>
									</li>
								))}
							</ul>
						</>
					) : (
						<p className="quiz-note">
							No single one is enough here: two of them have to go.
						</p>
					)}
				</section>
			)}

			{state.steps.length > 0 &&
				(question === undefined ? (
					<details className="quiz-recap">
						<summary>Your answers ({state.steps.length})</summary>
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
