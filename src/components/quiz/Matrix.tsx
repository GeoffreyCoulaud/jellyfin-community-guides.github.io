import type { Link, Option } from "../../quiz/engine";
import type { Row, Table } from "../../quiz/table";
import { Icon } from "./LinkList";
import "./matrix.css";

/** A next read is a row too, its label linking to the page. */
type Line = Row & { href?: string };

const nextReadLines = <O extends Option>(
	columns: readonly O[],
	nextReads: (option: O) => readonly Link[],
): Line[] => {
	const pages = new Map(
		columns.flatMap(nextReads).map((link) => [link.href, link]),
	);

	return [...pages.values()].map((link) => {
		const carried = columns.map((option) =>
			nextReads(option).some((one) => one.href === link.href),
		);
		return {
			key: link.href,
			label: link.title,
			href: link.href,
			tone: "con",
			carried,
			shared: carried.every(Boolean),
		};
	});
};

/** The mark is decoration, the hidden word is what screen readers read. */
const Cell = ({ tone, carried }: { tone: Row["tone"]; carried: boolean }) => (
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
	nextReads?: (option: O) => readonly Link[];
	/** Whether rows every option carries are shown. */
	showShared: boolean;
};

export const Matrix = <O extends Option>({
	table,
	nextReads,
	showShared,
}: Props<O>) => {
	const { columns } = table;
	const rowsOf = (tone: Row["tone"]) =>
		table.rows.filter(
			(row) => row.tone === tone && (showShared || !row.shared),
		);
	const sections: { title: string; lines: readonly Line[] }[] = [
		{ title: "Pros", lines: rowsOf("pro") },
		{ title: "Cons", lines: rowsOf("con") },
		{
			title: "You will also need",
			lines: nextReads === undefined ? [] : nextReadLines(columns, nextReads),
		},
	].filter((section) => section.lines.length > 0);

	return (
		<div className="quiz-matrix-scroll">
			<table className="quiz-matrix">
				<thead>
					<tr>
						<td />
						{columns.map((option) => (
							<th scope="col" key={option.slug}>
								<Icon src={option.icon} />
								<span>{option.title}</span>
							</th>
						))}
					</tr>
				</thead>
				{sections.map((section) => (
					<tbody key={section.title}>
						<tr className="quiz-matrix-section">
							<th scope="rowgroup">{section.title}</th>
							<td colSpan={columns.length} />
						</tr>
						{section.lines.map((line) => (
							<tr key={line.key}>
								<th scope="row">
									{line.href === undefined ? (
										line.label
									) : (
										<a href={line.href}>{line.label}</a>
									)}
								</th>
								{columns.map((option, column) => (
									<Cell
										key={option.slug}
										tone={line.tone}
										carried={line.carried[column] ?? false}
									/>
								))}
							</tr>
						))}
					</tbody>
				))}
			</table>
		</div>
	);
};
