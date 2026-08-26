import type { CSSProperties } from "react";
import {
	iconUrl,
	pipLabel,
	pipUrl,
	type Emblem as EmblemData,
} from "../icons/emblems";
import "./emblem.css";

type Props = {
	/** Absent for the pages that document a task rather than a tool. */
	emblem: EmblemData | undefined;
	size?: "text" | "title";
	/** Off by default: everywhere else the option is spelled out beside the icon. */
	withPips?: boolean;
};

/** The tool's icon, with the pips telling apart the options that share it. */
export const Emblem = ({ emblem, size = "text", withPips = false }: Props) => {
	if (emblem === undefined) return null;
	const pips = withPips ? (emblem.pips ?? []) : [];

	return (
		<span className={`emblem emblem-${size}`}>
			<img className="emblem-icon" src={iconUrl(emblem.icon)} alt="" />
			{pips.length > 0 && (
				<span
					className="emblem-pips"
					title={pips.map(pipLabel).join(", ")}
				>
					{pips.map((pip) => (
						<span
							key={pip}
							className="emblem-pip"
							style={
								{
									"--pip": `url("${pipUrl(pip)}")`,
								} as CSSProperties
							}
						/>
					))}
				</span>
			)}
		</span>
	);
};
