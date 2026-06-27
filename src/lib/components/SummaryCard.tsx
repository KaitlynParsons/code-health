import type { AsyncResult, BundleInfo, Smell } from '../../types';

interface Props {
    bundle: AsyncResult<BundleInfo>;
    smells: AsyncResult<Smell[]>;
}

export const SummaryCard = ({ bundle, smells }: Props) => {
    if (bundle.state === 'loading' || smells.state === 'loading') {
        return (
            <>
                <div className="health-bar">
                    <div className="health-bar__fill skeleton" style={{ width: '100%' }} />
                </div>
                <span className="skeleton skeleton--text" style={{ width: '70%', marginTop: '8px', display: 'block' }} />
            </>
        );
    }

    if (bundle.state === 'error' || smells.state === 'error') {
        return <p className="error">Failed to compute summary.</p>;
    }

    const totalBytes = bundle.data.internal.total.uncompressed;
    const smellBytes = smells.data.reduce((sum, s) => sum + s.size, 0);
    const smellPct = totalBytes > 0 ? Math.min(100, Math.round((smellBytes / totalBytes) * 100)) : 0;
    const healthPct = 100 - smellPct;

    const message = smellPct === 0
        ? 'Your internal code looks healthy. Keep it up!'
        : `${smellPct}% of your internal code has a sick smell. Take action to improve maintainability.`;

    return (
        <>
            <div className="health-bar">
                {healthPct > 0 && <div className="health-bar__fill health-bar__fill--healthy" style={{ width: `${healthPct}%` }} />}
                {smellPct > 0 && <div className="health-bar__fill health-bar__fill--smelly" style={{ width: `${smellPct}%` }} />}
            </div>
            <p className="health-bar__label">{message}</p>
        </>
    );
};
