import type { Option, Step } from "../../quiz/engine";
import { key, StepRow } from "./Step";
import "./recap.css";

/** A click ending a drag over the text is someone copying it, not answering. */
const selecting = () => (window.getSelection()?.toString().length ?? 0) > 0;

type RowProps<O extends Option> = {
	step: Step<O>;
	onRewind: () => void;
};

// The row is the click target and the pencil only the keyboard's way in: text
// inside a button cannot be selected.
const RecapRow = <O extends Option>({ step, onRewind }: RowProps<O>) => (
	<li
		onClick={() => {
			if (!selecting()) onRewind();
		}}
	>
		<StepRow step={step} />
		<button
			type="button"
			className="quiz-edit"
			aria-label={`Change: ${step.question?.question ?? step.label}`}
		>
			✎
		</button>
	</li>
);

type Props<O extends Option> = {
	steps: readonly Step<O>[];
	folded: boolean;
	onRewind: (index: number) => void;
};

export const Recap = <O extends Option>({
	steps,
	folded,
	onRewind,
}: Props<O>) => {
	if (steps.length === 0) return null;

	const rows = (
		<ol>
			{steps.map((step, index) => (
				<RecapRow
					key={key(step)}
					step={step}
					onRewind={() => onRewind(index)}
				/>
			))}
		</ol>
	);

	return folded ? (
		<details className="quiz-recap">
			<summary>Your answers ({steps.length})</summary>
			{rows}
		</details>
	) : (
		<section className="quiz-recap">
			<h3 className="quiz-heading">Your answers</h3>
			{rows}
		</section>
	);
};
