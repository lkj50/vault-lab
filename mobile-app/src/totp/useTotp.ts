import { useEffect, useRef, useState } from "react";
import { decodeBase32 } from "./base32";
import { generateTotp, secondsRemaining } from "./totp";

export interface TotpState {
  code: string;
  secondsLeft: number;
  progress: number;
}

export function useTotp(secret: string | null): TotpState {
  const [state, setState] = useState<TotpState>({
    code: "------",
    secondsLeft: 30,
    progress: 1,
  });
  const previousCode = useRef("------");
  const updateInProgress = useRef(false);

  useEffect(() => {
    if (!secret) return;

    let active = true;
    const update = async () => {
      if (updateInProgress.current || !active) return;
      updateInProgress.current = true;
      try {
        const now = Date.now();
        const secretBytes = decodeBase32(secret);

        // Calcula el nuevo código antes de reemplazar el mostrado.
        const nextCode = await generateTotp(secretBytes, now);
        if (!active) return;
        previousCode.current = nextCode;
        const secondsLeft = secondsRemaining(now);
        setState({
          code: nextCode,
          secondsLeft,
          progress: secondsLeft / 30,
        });
      } catch {
        if (active) {
          const now = Date.now();
          const secondsLeft = secondsRemaining(now);
          setState({
            code: previousCode.current,
            secondsLeft,
            progress: secondsLeft / 30,
          });
        }
      } finally {
        updateInProgress.current = false;
      }
    };

    void update();
    const interval = setInterval(() => void update(), 250);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [secret]);

  return state;
}
