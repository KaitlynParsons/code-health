import type { AsyncResult, BundleInfo } from '../../types';

const formatSize = (bytes: number): string => {
	if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
	if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
	return `${bytes} B`;
};

const SkeletonRow = () => (
	<div className="row">
		<span className="skeleton skeleton--text" />
		<span className="skeleton skeleton--text skeleton--short" />
	</div>
);

export const InternalBundleCard = ({ bundle }: { bundle: AsyncResult<BundleInfo> }) => {
	return (
		<div className="section">
			<h2>Internal Bundle Size</h2>
			{bundle.state === 'loading' && (
				<>
					<SkeletonRow />
					<SkeletonRow />
				</>
			)}
			{bundle.state === 'error' && (
				<p className="error">Failed to compute bundle size.</p>
			)}
			{bundle.state === 'success' && (
				<>
					<div className="row">
						<span>Uncompressed</span>
						<span>{formatSize(bundle.data.internal.total.uncompressed)}</span>
					</div>
					<div className="row">
						<span>Compressed</span>
						<span>{formatSize(bundle.data.internal.total.compressed)}</span>
					</div>
				</>
			)}
		</div>
	);
};
