import type { Option } from "../../quiz/engine";
import { Emblem } from "../Emblem";
import type { Doc } from "./Doc";

type Props<O extends Option> = {
	options: readonly O[];
	pool: readonly O[];
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
 * How far the quiz has got, as a bar over the count it captions. Measured
 * against `total - 1`, not `total`: one option left is the end of the quiz, so
 * the last elimination fills the bar rather than leaving it a step short.
 */
export const Progress = <O extends Option>({
	options,
	pool,
	doc,
}: Props<O>) => {
	const total = options.length;
	const left = pool.length;
	const done = total > 1 ? Math.min((total - left) / (total - 1), 1) : 1;
	const standing = (option: O) => pool.includes(option);
	// Stable sort, so each half keeps the order the quiz declares its options in
	const listed = [...options].sort(
		(one, other) => Number(standing(other)) - Number(standing(one)),
	);

	return (
		<div className="quiz-progress">
			<div
				className="quiz-bar"
				role="progressbar"
				aria-label="Options eliminated"
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={Math.round(done * 100)}
			>
				<span
					className="quiz-bar-fill"
					style={{ width: `${done * 100}%` }}
				/>
			</div>
			<details className="quiz-pool">
				<summary>
					{left} option{left === 1 ? "" : "s"} left, out of {total}.
				</summary>
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
