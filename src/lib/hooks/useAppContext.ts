import { createContext, useContext } from "react";
import type { AsyncResult, Report } from "../../types";

interface AppContextValue {
  report: AsyncResult<Report>;
  postMessage: (msg: unknown) => void;
  gitDiffOnly: boolean;
  setGitDiffOnly: (value: boolean) => void;
}

export const AppContext = createContext<AppContextValue>({
  report: { state: "loading" },
  postMessage: () => {},
  gitDiffOnly: true,
  setGitDiffOnly: () => {},
});

export const useGetAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useGetAppContext must be used within an AppProvider');
  }
  return context;
};
