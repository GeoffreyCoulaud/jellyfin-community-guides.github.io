import { type Option, type Quiz, traitsOf } from "../../quiz/engine";
import { Icon, LinkList } from "./LinkList";
import { Traits } from "./Traits";

export const Result = <O extends Option>({
	quiz,
	option,
}: {
	quiz: Quiz<O>;
	option: O;
}) => {
	const nextReads = quiz.nextReads?.(option) ?? [];

	return (
		<section>
			<h2 className="quiz-title quiz-result-title">
				<Icon src={option.icon} large />
				<a href={option.href}>{option.title}</a>
			</h2>
			<Traits traits={traitsOf(option, quiz.axes)} />
			{nextReads.length > 0 && (
				<LinkList heading="You will also need" links={nextReads} />
			)}
		</section>
	);
};
