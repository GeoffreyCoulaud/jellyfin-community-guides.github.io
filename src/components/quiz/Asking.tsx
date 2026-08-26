import {
	liveAnswers,
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

type Props<O extends Option> = {
	question: Question<O>;
	pool: readonly O[];
	onAnswer: (picked: Answer<O>) => void;
};

export const Asking = <O extends Option>({
	question,
	pool,
	onAnswer,
}: Props<O>) => (
	<section>
		<h2 className="quiz-title">
			<Badge>{kindOf(question)}</Badge>
			{question.question}
		</h2>
		{question.help !== undefined && (
			<p className="quiz-note">{linkify(question.help)}</p>
		)}
		<ul className="quiz-answers">
			{liveAnswers(question, pool).map((picked) => (
				<li key={picked.label}>
					<button type="button" onClick={() => onAnswer(picked)}>
						{picked.label}
					</button>
				</li>
			))}
		</ul>
	</section>
);
