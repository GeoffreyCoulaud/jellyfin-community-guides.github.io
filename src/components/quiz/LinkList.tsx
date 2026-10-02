import type { Link } from "../../quiz/engine";

/** White tile behind the logo, so dark logos stay visible in the dark theme. */
export const Icon = ({ src, large }: { src?: string; large?: boolean }) =>
	src === undefined ? null : (
		<img
			className={large ? "quiz-icon quiz-icon-large" : "quiz-icon"}
			src={src}
			alt=""
		/>
	);

export const LinkList = ({
	heading,
	links,
}: {
	heading: string;
	links: readonly Link[];
}) => (
	<div className="quiz-block">
		<h3 className="quiz-heading">{heading}</h3>
		<ul className="quiz-links">
			{links.map((link) => (
				<li key={link.href}>
					<a href={link.href}>
						<Icon src={link.icon} />
						{link.title}
					</a>
				</li>
			))}
		</ul>
	</div>
);
