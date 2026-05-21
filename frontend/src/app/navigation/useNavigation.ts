import { useEffect, useRef } from "react";

type UseNavigationParams = {
  route: Array<[number, number]>;
  navigating: boolean;
  speedMs: number;
  onPosition: (point: [number, number], index: number) => void;
  onComplete: () => void;
};

export function useNavigation({ route, navigating, speedMs, onPosition, onComplete }: UseNavigationParams) {
  const onPositionRef = useRef(onPosition);
  const onCompleteRef = useRef(onComplete);

  onPositionRef.current = onPosition;
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!navigating || route.length < 2) {
      return;
    }

    let i = 0;
    const timer = window.setInterval(() => {
      const point = route[i];
      if (!point) {
        window.clearInterval(timer);
        onCompleteRef.current();
        return;
      }

      onPositionRef.current(point, i);
      i += 1;

      if (i >= route.length) {
        window.clearInterval(timer);
        onCompleteRef.current();
      }
    }, speedMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [navigating, route, speedMs]);
}
