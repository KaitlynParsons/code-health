import type { Smell } from '../../types';

const smellTypeLabel: Record<string, string> = {
	dead: 'Dead Code',
	duplicate: 'Duplicate Code',
	longParams: 'Long Parameter List',
};

const formatType = (type: string) => smellTypeLabel[type] ?? type;

interface SmellDetailsProps {
	type: string;
	items: Smell[];
}

export const SmellDetails = ({ type, items }: SmellDetailsProps) => (
	<details>
		<summary key={type}>
			<span>{formatType(type)}</span>
			<span>{items.length}</span>
		</summary>
		{items.map(({ file, startLine, endLine, message }) => (
			<div className="row">
				<span>{`${file}:${startLine}:${endLine}`}</span>
				<span>{message}</span>
			</div>
		))}
	</details>
);
