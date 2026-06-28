import { useCallback, useEffect, useState } from "react";

type InitialLoaderPhase = "waiting" | "active" | "exiting" | "done";

export const useInitialLoaderState = (isLoading: boolean) => {
  const [phase, setPhase] = useState<InitialLoaderPhase>("waiting");

  useEffect(() => {
    setPhase((currentPhase) => {
      if (currentPhase === "waiting" && isLoading) {
        return "active";
      }

      if (currentPhase === "active" && !isLoading) {
        return "exiting";
      }

      return currentPhase;
    });
  }, [isLoading]);

  const completeInitialLoader = useCallback(() => {
    setPhase((currentPhase) => (currentPhase === "exiting" ? "done" : currentPhase));
  }, []);

  return {
    completeInitialLoader,
    initialLoaderActive: phase === "active",
    showInitialLoader: phase === "active" || phase === "exiting"
  };
};
