import type { Loadable, ModuleNode, SmellMap } from '../../types';

interface Props {
    bundle: Loadable<ModuleNode["uncompressed"]>;
    smells: Loadable<SmellMap>;
}

function formatBytes(bytes: number): string {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${bytes} B`;
}

function healthBarColor(healthPct: number): string {
    if (healthPct > 70) return 'health-bar__fill--healthy';
    if (healthPct > 30) return 'health-bar__fill--warning';
    return 'health-bar__fill--critical';
}

export const SummaryCard = ({ bundle, smells }: Props) => {
    if (bundle.state === 'loading' || smells.state === 'loading') {
        return (
            <>
                <div className="health-bar">
                    <div className="health-bar__fill skeleton" style={{ width: '100%' }} />
                </div>
                <span className="skeleton skeleton--text" style={{ width: '70%', marginTop: '8px', display: 'block' }} />
                <div className="row">
                    <span className="skeleton skeleton--text" />
                </div>
            </>
        );
    }

    const totalBytes = bundle.data;
    const smellBytes = Object.values(smells.data).flat().reduce((sum, s) => sum + s.size, 0);
    const smellPct = totalBytes > 0 ? Math.min(100, Math.round((smellBytes / totalBytes) * 100)) : 0;
    const healthPct = 100 - smellPct;
    const healthyBytes = totalBytes - smellBytes;

    const message = smellPct === 0
        ? 'Your internal code looks healthy!'
        : `${smellPct}% of your internal code smells unwell.`;

    return (
        <>
            <div className="health-bar">
                {healthPct > 0 && <div className={`health-bar__fill ${healthBarColor(healthPct)}`} style={{ width: `${healthPct}%` }} />}
                {smellPct > 0 && <div className="health-bar__fill health-bar__fill--smelly" style={{ width: `${smellPct}%` }} />}
            </div>
            <p className="health-bar__label">
                <span className="health-bar__heart">♥</span> {formatBytes(healthyBytes)} / {formatBytes(totalBytes)}
            </p>
            <p className="health-bar__label">{message}</p>
        </>
    );
};
