import {
	deadAnswers,
	type Answer,
	type Option,
	type Question,
} from "../../quiz/engine";
import { Badge, kindOf } from "./Step";

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

// Text rather than a button nobody can press: a disabled control is skipped by
// screen readers, and this is there to be read.
const Dead = ({ label }: { label: string }) => (
	<span className="quiz-dead">{label}</span>
);

type Props<O extends Option> = {
	question: Question<O>;
	pool: readonly O[];
	onAnswer: (picked: Answer<O>) => void;
};

export const Asking = <O extends Option>({
	question,
	pool,
	onAnswer,
}: Props<O>) => {
	const dead = new Set(deadAnswers(question, pool));

	return (
		<section>
			<h2 className="quiz-title">
				<Badge>{kindOf(question)}</Badge>
				{question.question}
			</h2>
			{question.help !== undefined && (
				<p className="quiz-note">{linkify(question.help)}</p>
			)}
			{/* In the order the question writes them, the dead ones in place */}
			<ul className="quiz-answers">
				{question.answers.map((answer) => (
					<li key={answer.id}>
						{dead.has(answer) ? (
							<Dead label={answer.label} />
						) : (
							<button
								type="button"
								onClick={() => onAnswer(answer)}
							>
								{answer.label}
							</button>
						)}
					</li>
				))}
			</ul>
			{dead.size > 0 && (
				<p className="quiz-note">
					Dead ends: your answers ruled out everything they lead to.
				</p>
			)}
		</section>
	);
};
