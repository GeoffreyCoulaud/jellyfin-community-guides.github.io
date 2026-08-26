import { useEffect, useRef, type RefObject } from "react";
import type { Option, Step } from "../../quiz/engine";
import type { Row, Table } from "../../quiz/table";
import "./matrix.css";
import { Emblem } from "../Emblem";
import type { Doc } from "./Doc";

/** A guide names a page to go and read; a pro or a con names nothing. */
type Line<O extends Option> = Row<O> & { href?: string };

const carriers = <O extends Option>(line: Line<O>) =>
	line.carried.filter((carried) => carried).length;

/**
 * Marked the way cons are and never folded away: a second guide every option
 * needs is worth reading before picking any of them.
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

/** The mark is decoration: the word is what a screen reader is read. */
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

/**
 * Not `position: sticky`: the table scrolls sideways in a box of its own, and a
 * box that scrolls in one axis is the scrollport for both, so a `top` set inside
 * it is measured against something that never scrolls down. The offset is taken
 * instead from a pin outside that box, and handed on as a plain translation.
 */
const usePinnedHeader = (
	pin: RefObject<HTMLDivElement | null>,
	matrix: RefObject<HTMLTableElement | null>,
) => {
	useEffect(() => {
		const table = matrix.current;
		const line = pin.current;
		if (table === null || line === null) return;

		let asked = 0;
		// Set on the header row and the title cell rather than on the table: an
		// inherited property written high up restyles every cell under it.
		const carry = (element: HTMLElement, pixels: number) => {
			const travelled = `${pixels}px`;
			if (element.style.getPropertyValue("--shift") === travelled) return;
			element.style.setProperty("--shift", travelled);
		};
		const place = () => {
			asked = 0;
			const head = table.tHead;
			if (head === null) return;
			// Measured first, written afterwards: a style set between two
			// measurements has the browser lay the table out again.
			const pinned = line.getBoundingClientRect();
			// The pin travels with the header, so this is the header's own travel
			const travel: [HTMLElement, number][] = [
				[head, pinned.top - table.getBoundingClientRect().top],
			];
			for (const section of Array.from(table.tBodies)) {
				const title =
					section.querySelector<HTMLElement>(".quiz-matrix-title");
				if (title === null) continue;
				const box = section.getBoundingClientRect();
				const room = Math.max(box.height - pinned.height, 0);
				const held = Math.max(pinned.top - box.top, 0);
				travel.push([title, Math.min(held, room)]);
			}
			for (const [element, pixels] of travel) carry(element, pixels);
		};
		const ask = () => {
			if (asked === 0) asked = requestAnimationFrame(place);
		};

		place();
		// Revealing the rows every option carries makes the table another size
		const watch = new ResizeObserver(ask);
		watch.observe(table);
		window.addEventListener("scroll", ask, { passive: true });
		window.addEventListener("resize", ask);
		return () => {
			cancelAnimationFrame(asked);
			watch.disconnect();
			window.removeEventListener("scroll", ask);
			window.removeEventListener("resize", ask);
		};
	}, [pin, matrix]);
};

type Props<O extends Option> = {
	table: Table<O>;
	doc: (option: O) => Doc;
	guides?: (option: O) => readonly Doc[];
	revealed: boolean;
	onDealbreaker: (refused: Step<O>) => void;
};

/**
 * A column is headed by its emblem and named nowhere: a dozen names across the
 * top is a table nothing but the page's width can hold. A con is refused from
 * its label, the one thing still in reach once the table scrolls sideways.
 */
export const Matrix = <O extends Option>({
	table,
	doc,
	guides,
	revealed,
	onDealbreaker,
}: Props<O>) => {
	const pin = useRef<HTMLDivElement>(null);
	const matrix = useRef<HTMLTableElement>(null);
	usePinnedHeader(pin, matrix);

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
		<div className="quiz-matrix-frame">
			{/* Where the header would come to rest if sticky worked in here */}
			<div className="quiz-matrix-pin" ref={pin} aria-hidden="true" />
			<div className="quiz-matrix-scroll">
				<table className="quiz-matrix" ref={matrix}>
					<thead>
						<tr>
							<td className="quiz-matrix-title">
								{sections[0]?.title}
							</td>
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
					{sections.map((section, index) => (
						<tbody key={section.title}>
							{index > 0 && (
								<tr className="quiz-matrix-break">
									<th
										scope="rowgroup"
										className="quiz-matrix-title"
									>
										{section.title}
									</th>
									<td colSpan={columns.length} />
								</tr>
							)}
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
						</tbody>
					))}
				</table>
			</div>
		</div>
	);
};
