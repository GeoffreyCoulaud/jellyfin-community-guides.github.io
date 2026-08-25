import type { Emblem as EmblemData } from "../../icons/emblems";
import { Emblem } from "../Emblem";

/**
 * An option or an extra guide, as the page the user should end up reading. Two
 * options can name the same page, so the emblem travels with the option rather
 * than being looked up from where it points.
 */
export type Doc = { title: string; href: string; emblem?: EmblemData };

/** A page to go and read, behind the icon of whatever it documents. */
export const DocLink = ({ doc }: { doc: Doc }) => (
	<a href={doc.href}>
		<Emblem emblem={doc.emblem} />
		{doc.title}
	</a>
);

type BlockProps = {
	heading: string;
	note?: string;
	docs: readonly Doc[];
};

/** A heading over pages to go and read, the shape both lists under a result take. */
export const DocBlock = ({ heading, note, docs }: BlockProps) => (
	<div className="quiz-block">
		<h3 className="quiz-heading">{heading}</h3>
		{note !== undefined && <p className="quiz-note">{note}</p>}
		<ul className="quiz-links">
			{docs.map((doc) => (
				<li key={`${doc.href} ${doc.title}`}>
					<DocLink doc={doc} />
				</li>
			))}
		</ul>
	</div>
);
