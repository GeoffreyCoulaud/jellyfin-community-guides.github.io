import type { Answered, Option } from "../../quiz/engine";
import { KindBadge } from "./KindBadge";

type Props<O extends Option> = {
	answers: readonly Answered<O>[];
	onChange: (index: number) => void;
};

export const Recap = <O extends Option>({ answers, onChange }: Props<O>) => {
	if (answers.length === 0) {
		return null;
	}

	return (
		<section className="quiz-recap">
			<h3 className="quiz-heading">Your answers</h3>
			<p className="quiz-note">Changing an answer clears the ones after it.</p>
			<ol>
				{answers.map(({ question, answer }, index) => (
					<li key={question.id}>
						<KindBadge kind={question.kind} />
						<span className="quiz-recap-text">
							{question.question} <strong>{answer.label}</strong>
						</span>
						<button
							type="button"
							className="quiz-text-button"
							aria-label={`Change: ${question.question}`}
							onClick={() => onChange(index)}
						>
							Change
						</button>
					</li>
				))}
			</ol>
		</section>
	);
};
