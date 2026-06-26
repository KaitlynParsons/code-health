import type { BundleInfo } from '../../types';

const formatSize = (bytes: number): string => {
	if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
	if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
	return `${bytes} B`;
};

export const InternalBundleCard = ({ bundle }: { bundle: BundleInfo }) => {
	const { uncompressed, compressed } = bundle.internal.total;
	return (
		<div className="section">
			<h2>Internal Bundle Size</h2>
			<div className="row">
				<span>Uncompressed</span>
				<span>{formatSize(uncompressed)}</span>
			</div>
			<div className="row">
				<span>Compressed</span>
				<span>{formatSize(compressed)}</span>
			</div>
		</div>
	);
};
