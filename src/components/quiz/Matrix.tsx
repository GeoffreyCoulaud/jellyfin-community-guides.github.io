import { Fragment } from "react";
import type { Option, Step } from "../../quiz/engine";
import type { Row, Table } from "../../quiz/table";
import "./matrix.css";
import { Emblem } from "../Emblem";
import type { Doc } from "./Doc";

/**
 * A row of the grid: what it says, and which columns say it. A guide names a
 * page to go and read, a pro or a con names nothing and only reads.
 */
type Line<O extends Option> = Row<O> & { href?: string };

const carriers = <O extends Option>(line: Line<O>) =>
	line.carried.filter((carried) => carried).length;

/**
 * The extra guides as rows of their own: not something an option is like, but
 * something it takes, which is why they are marked the way cons are and never
 * folded away. Every option needing the same second guide is worth reading
 * before picking any of them, not worth hiding because they agree on it.
 */
const guideLines = <O extends Option>(
	columns: readonly O[],
	guides: (option: O) => readonly Doc[],
): Line<O>[] => {
	const named = (page: Doc) => `${page.href} ${page.title}`;
	const pages = new Map<string, Doc>();
	for (const option of columns)
		for (const page of guides(option)) pages.set(named(page), page);

	return [...pages]
		.map(([key, page]): Line<O> => {
			const carried = columns.map((option) =>
				guides(option).some((one) => named(one) === key),
			);
			return {
				key,
				label: page.title,
				href: page.href,
				tone: "con",
				carried,
				shared: carried.every((one) => one),
			};
		})
		.sort((one, other) => carriers(other) - carriers(one));
};

/**
 * Whether the row applies to that column. The mark is decoration: the word is
 * what a screen reader is read, an empty cell saying "no" rather than nothing.
 */
const Cell = ({ tone, carried }: { tone: "pro" | "con"; carried: boolean }) => (
	<td>
		{carried && (
			<span className={`quiz-mark-${tone}`} aria-hidden="true">
				{tone === "pro" ? "✓" : "✗"}
			</span>
		)}
		<span className="quiz-hidden">{carried ? "Yes" : "No"}</span>
	</td>
);

type Props<O extends Option> = {
	table: Table<O>;
	doc: (option: O) => Doc;
	guides?: (option: O) => readonly Doc[];
	/** Whether the rows every column carries are drawn or left folded away. */
	revealed: boolean;
	onDealbreaker: (refused: Step<O>) => void;
};

/**
 * What the options left say about themselves, side by side, under a heading per
 * kind of thing said, minus the rows all of them carry until a reader asks for
 * those. A column is headed by its emblem and named nowhere: a dozen names
 * across the top is a table nothing but the page's width can hold, and the list
 * under it names them all in the order they stand in. The header's `title`
 * names one on its own.
 *
 * A con is refused from the label rather than from a column of its own at the
 * far end: with a dozen options left the table scrolls, and the label is the
 * one thing pinned where a reader can still reach it.
 */
export const Matrix = <O extends Option>({
	table,
	doc,
	guides,
	revealed,
	onDealbreaker,
}: Props<O>) => {
	const { columns } = table;
	const said = (tone: "pro" | "con") =>
		table.rows.filter(
			(row) => row.tone === tone && (revealed || !row.shared),
		);
	const sections: { title: string; lines: readonly Line<O>[] }[] = [
		{ title: "Pros", lines: said("pro") },
		{ title: "Cons", lines: said("con") },
		{
			title: "Additional Guides",
			lines: guides === undefined ? [] : guideLines(columns, guides),
		},
	].filter((section) => section.lines.length > 0);

	return (
		<div className="quiz-matrix-scroll">
			<table className="quiz-matrix">
				<thead>
					<tr>
						<th scope="col">
							<span className="quiz-hidden">Trait</span>
						</th>
						{columns.map((option) => {
							const page = doc(option);
							return (
								<th
									scope="col"
									key={option.slug}
									title={page.title}
								>
									<Emblem emblem={page.emblem} withPips />
									<span className="quiz-hidden">
										{page.title}
									</span>
								</th>
							);
						})}
					</tr>
				</thead>
				<tbody>
					{sections.map((section) => (
						<Fragment key={section.title}>
							<tr className="quiz-section">
								<th
									scope="colgroup"
									colSpan={columns.length + 1}
								>
									{section.title}
								</th>
							</tr>
							{section.lines.map((line) => {
								const refusal = line.refusal;
								return (
									<tr key={line.key}>
										<th scope="row">
											{refusal !== undefined && (
												<button
													type="button"
													title="Dealbreaker: run the quiz again without it"
													aria-label={`Dealbreaker: ${line.label}`}
													onClick={() =>
														onDealbreaker(refusal)
													}
												>
													✕
												</button>
											)}
											{line.href === undefined ? (
												line.label
											) : (
												<a href={line.href}>
													{line.label}
												</a>
											)}
										</th>
										{columns.map((option, column) => (
											<Cell
												key={option.slug}
												tone={line.tone}
												carried={
													line.carried[column] ??
													false
												}
											/>
										))}
									</tr>
								);
							})}
						</Fragment>
					))}
				</tbody>
			</table>
		</div>
	);
};
