import { AnimatePresence, m } from "motion/react";
import { useNavigation } from "react-router";

/** A gold hairline across the top while a navigation is pending. */
export function NavigationProgress() {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  return (
    <AnimatePresence>
      {busy ? (
        <m.div
          key="progress"
          aria-hidden="true"
          className="sv-progress"
          initial={{ scaleX: 0, opacity: 1 }}
          animate={{ scaleX: 0.85, transition: { duration: 2.4, ease: [0.19, 1, 0.22, 1] } }}
          exit={{ scaleX: 1, opacity: 0, transition: { duration: 0.35 } }}
        />
      ) : null}
    </AnimatePresence>
  );
}
