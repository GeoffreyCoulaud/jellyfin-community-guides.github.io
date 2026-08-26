import {
	questionsLeft,
	type Option,
	type Quiz,
	type QuizState,
} from "../../quiz/engine";
import { Emblem } from "../Emblem";
import type { Doc } from "./Doc";
import "./progress.css";

type Props<O extends Option> = {
	quiz: Quiz<O>;
	state: QuizState<O>;
	doc: (option: O) => Doc;
};

/** Ruled out, still listed: what the bar is counting is worth seeing by name. */
const PoolRow = ({ page, standing }: { page: Doc; standing: boolean }) => (
	<li className={standing ? undefined : "quiz-pool-out"}>
		<Emblem emblem={page.emblem} />
		<span>{page.title}</span>
	</li>
);

/**
 * How far the quiz has got, as one bar over the two counts it captions. Options
 * are measured against `total - 1`, not `total`: one option left is the end of
 * the quiz, so the last elimination fills the bar rather than leaving it a step
 * short. Questions are measured against what is still worth asking, which is
 * what moves the bar when an answer rules nothing out.
 */
export const Progress = <O extends Option>({ quiz, state, doc }: Props<O>) => {
	const total = quiz.options.length;
	const left = state.pool.length;
	const asked = state.steps.filter(
		(step) => step.question !== undefined,
	).length;
	const questions = questionsLeft(quiz, state);
	const byOptions = total > 1 ? Math.min((total - left) / (total - 1), 1) : 1;
	const byQuestions = asked + questions > 0 ? asked / (asked + questions) : 1;
	const done = (byOptions + byQuestions) / 2;
	const caption =
		`${left}/${total} options left. ` +
		`At most ${questions} question${questions === 1 ? "" : "s"} left.`;
	const standing = (option: O) => state.pool.includes(option);
	// Stable sort, so each half keeps the order the quiz declares its options in
	const listed = [...quiz.options].sort(
		(one, other) => Number(standing(other)) - Number(standing(one)),
	);

	return (
		<div className="quiz-progress">
			<div
				className="quiz-bar"
				role="progressbar"
				aria-label="Quiz progress"
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={Math.round(done * 100)}
				aria-valuetext={caption}
			>
				<span
					className="quiz-bar-fill"
					style={{ width: `${done * 100}%` }}
				/>
			</div>
			<details className="quiz-pool">
				<summary>{caption}</summary>
				<ul>
					{listed.map((option) => (
						<PoolRow
							key={option.slug}
							page={doc(option)}
							standing={standing(option)}
						/>
					))}
				</ul>
			</details>
		</div>
	);
};
