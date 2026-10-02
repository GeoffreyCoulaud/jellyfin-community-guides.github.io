import {
	type Answer,
	isDeadEnd,
	type Option,
	type Question,
} from "../../quiz/engine";
import { KindBadge } from "./KindBadge";

type Props<O extends Option> = {
	question: Question<O>;
	pool: readonly O[];
	onAnswer: (answer: Answer<O>) => void;
	/** Absent on the first question. */
	onBack?: () => void;
};

export const Asking = <O extends Option>({
	question,
	pool,
	onAnswer,
	onBack,
}: Props<O>) => {
	const hasDeadEnd = question.answers.some((answer) => isDeadEnd(answer, pool));

	return (
		<section>
			<h2 className="quiz-title">
				<KindBadge kind={question.kind} />
				{question.question}
			</h2>
			{question.help !== undefined && (
				<p className="quiz-note">{question.help}</p>
			)}
			<ul className="quiz-answers">
				{question.answers.map((answer) => (
					<li key={answer.id}>
						{/* Text, not a disabled button: screen readers skip disabled controls */}
						{isDeadEnd(answer, pool) ? (
							<span className="quiz-dead">{answer.label}</span>
						) : (
							<button type="button" onClick={() => onAnswer(answer)}>
								{answer.label}
							</button>
						)}
					</li>
				))}
			</ul>
			{hasDeadEnd && (
				<p className="quiz-note">
					Greyed out: a previous answer rules this out.
				</p>
			)}
			{onBack !== undefined && (
				<button type="button" className="quiz-text-button" onClick={onBack}>
					Back
				</button>
			)}
		</section>
	);
};
