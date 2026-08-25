import type { Option, Step } from "../../quiz/engine";
import { key, StepRow } from "./Step";

type Props<O extends Option> = {
	/** The steps that, taken back on their own, open the pool up again. */
	blocking: readonly Step<O>[];
	onDrop: (step: Step<O>) => void;
};

/** Every option is ruled out, so a step has to give. */
export const Stuck = <O extends Option>({ blocking, onDrop }: Props<O>) => (
	<section>
		<h2 className="quiz-title">Nothing does all of that</h2>
		{blocking.length === 0 ? (
			<p className="quiz-note">
				No single one is enough here: two of them have to go.
			</p>
		) : (
			<>
				<p className="quiz-note">
					Take one back and it stops being a requirement. The question
					comes back only if it still tells options apart.
				</p>
				<ul className="quiz-swaps">
					{blocking.map((step) => (
						<li key={key(step)}>
							<button type="button" onClick={() => onDrop(step)}>
								<StepRow step={step} />
								<span className="quiz-action">↺ Take back</span>
							</button>
						</li>
					))}
				</ul>
			</>
		)}
	</section>
);
