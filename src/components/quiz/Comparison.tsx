import { useState } from "react";
import { type Option, type Quiz, traitsOf } from "../../quiz/engine";
import { tabulate } from "../../quiz/table";
import { LinkList } from "./LinkList";
import { Matrix } from "./Matrix";

/** No question tells these options apart, so none is put forward. */
export const Comparison = <O extends Option>({
	quiz,
	options,
}: {
	quiz: Quiz<O>;
	options: readonly O[];
}) => {
	const table = tabulate(options, (option) => traitsOf(option, quiz.axes));
	const [showShared, setShowShared] = useState(false);
	const sharedCount = table.rows.filter((row) => row.shared).length;
	const allShared = sharedCount === table.rows.length;

	return (
		<section>
			<h2 className="quiz-title">Several options fit your answers</h2>
			<div className="quiz-block">
				{allShared && (
					<p className="quiz-note">
						Nothing here tells them apart: every row holds whichever you pick.
					</p>
				)}
				<Matrix
					table={table}
					nextReads={quiz.nextReads}
					showShared={showShared || allShared}
				/>
				{sharedCount > 0 && !allShared && (
					<button
						type="button"
						className="quiz-text-button"
						aria-expanded={showShared}
						onClick={() => setShowShared(!showShared)}
					>
						{showShared ? "Hide" : "Show"} what they have in common
					</button>
				)}
			</div>
			<LinkList heading="Read up on one" links={table.columns} />
		</section>
	);
};
