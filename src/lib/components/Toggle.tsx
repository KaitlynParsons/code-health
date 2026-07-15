import { useGetAppContext } from "../hooks/useAppContext";

export const Toggle = () => {
    const { gitDiffOnly, setGitDiffOnly, postMessage, report } = useGetAppContext();

    return <label className="toggle">
        <input
            type="checkbox"
            role="switch"
            checked={gitDiffOnly}
            onChange={e => {
                if (report.state === "loading") return;
                const checked = e.target.checked;
                setGitDiffOnly(checked);
                postMessage({ type: 'ready', gitDiffOnly: checked });
            }}
        />
        <span className="toggle__track" aria-hidden="true" />
    </label>
}