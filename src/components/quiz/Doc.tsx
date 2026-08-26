import type { Emblem as EmblemData } from "../../icons/emblems";
import { Emblem } from "../Emblem";

/** Two options can name the same page, so the emblem travels with the option. */
export type Doc = { title: string; href: string; emblem?: EmblemData };

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
