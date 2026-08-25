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
	/** Next to running text, or next to the heading naming the recommendation. */
	size?: "text" | "title";
	/**
	 * Draw the pips as well. Off by default: everywhere but the recommendation
	 * itself, the row spells the option out in words right next to the icon, and
	 * a pip repeating it in 8 pixels only crowds the logo.
	 */
	withPips?: boolean;
};

/**
 * The tool's icon. On the recommendation, the pips telling that option from the
 * others sharing the icon are drawn in the corner: one sits in a circle,
 * several stretch it into a pill.
 */
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
