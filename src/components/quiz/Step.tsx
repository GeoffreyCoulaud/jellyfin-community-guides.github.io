import type { Option, Question, Step } from "../../quiz/engine";

export const key = <O extends Option>(step: Step<O>) =>
	`${step.question?.id ?? "dealbreaker"}: ${step.label}`;

/** Softest first: a preference gives before a refusal, a refusal before a fact. */
export const givesFirst = <O extends Option>(step: Step<O>) =>
	step.question === undefined
		? 1
		: step.question.kind === "preference"
			? 0
			: 2;

export const Badge = ({ children }: { children: string }) => (
	<span className="quiz-badge">{children}</span>
);

/** Facts hold, preferences get weighed again: worth knowing before answering. */
export const kindOf = <O extends Option>(question: Question<O> | undefined) =>
	question === undefined
		? "Dealbreaker"
		: question.kind === "fact"
			? "Fact"
			: "Preference";

/** A step as a row: what it was, and what kind of thing it was. */
export const StepRow = <O extends Option>({ step }: { step: Step<O> }) => (
	<>
		<Badge>{kindOf(step.question)}</Badge>
		<span className="quiz-recap-text">
			{step.question !== undefined && `${step.question.question} `}
			<strong>{step.label}</strong>
		</span>
	</>
);
