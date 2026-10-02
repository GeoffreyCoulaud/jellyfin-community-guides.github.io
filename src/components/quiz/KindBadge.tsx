export const KindBadge = ({ kind }: { kind: "fact" | "preference" }) => (
	<span className="quiz-badge">{kind === "fact" ? "Fact" : "Preference"}</span>
);
