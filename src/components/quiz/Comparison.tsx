import { useState } from "react";
import type { Option, Step, Trait } from "../../quiz/engine";
import { tabulate } from "../../quiz/table";
import { Emblem } from "../Emblem";
import type { Doc } from "./Doc";
import { Matrix } from "./Matrix";
import "./comparison.css";

type Props<O extends Option> = {
	/** Everything still standing, in pool order, none of them leading. */
	options: readonly O[];
	doc: (option: O) => Doc;
	guides?: (option: O) => Doc[];
	traits?: (option: O) => readonly Trait<O>[];
	onDealbreaker: (refused: Step<O>) => void;
};

/**
 * None is put forward: every question that could have told them apart has been
 * asked, which makes the rest the reader's own call.
 */
export const Comparison = <O extends Option>({
	options,
	doc,
	guides,
	traits,
	onDealbreaker,
}: Props<O>) => {
	const table = tabulate(options, traits ?? (() => []));
	const [asked, setAsked] = useState(false);
	const alike = table.rows.filter((row) => row.shared).length;
	const apart = table.rows.length - alike;
	// Folded away by default, unless folding it away leaves an empty grid
	const revealed = asked || apart === 0;
	// A pool with nothing to say for itself still has pages to send you to
	const said =
		table.rows.length > 0 ||
		table.columns.some((option) => (guides?.(option) ?? []).length > 0);

	return (
		<section>
			<h2 className="quiz-title">Several options fit your answers</h2>

			<p className="quiz-note">
				Is one of the cons a dealbreaker? <br/>Say so, and the quiz runs
				again with every option carrying it gone.
			</p>

			{said && (
				<div className="quiz-block">
					{apart === 0 && (
						<p className="quiz-note">
							Nothing here tells them apart: every row holds
							whichever you pick.
						</p>
					)}
					<Matrix
						table={table}
						doc={doc}
						guides={guides}
						revealed={revealed}
						onDealbreaker={onDealbreaker}
					/>
					{alike > 0 && apart > 0 && (
						<button
							type="button"
							className="quiz-reveal"
							aria-expanded={revealed}
							onClick={() => setAsked(!asked)}
						>
							{revealed ? "Hide" : "Show"} common traits
						</button>
					)}
				</div>
			)}

			<div className="quiz-block">
				<h3 className="quiz-heading">Read up on one</h3>
				<ul className="quiz-picks">
					{table.columns.map((option) => {
						const page = doc(option);
						return (
							<li key={option.slug}>
								<a href={page.href}>
									<Emblem
										emblem={page.emblem}
										withPips
									/>
									<span>{page.title}</span>
								</a>
							</li>
						);
					})}
				</ul>
			</div>
		</section>
	);
};
