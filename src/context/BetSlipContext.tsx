"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export interface BetSlipLeg {
  eventId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  betType: "moneyline" | "spread" | "total";
  selection: string;
  line?: number;
  odds: number;
  isLive?: boolean;
  label: string;
}

interface BetSlipContextType {
  legs: BetSlipLeg[];
  addLeg: (leg: BetSlipLeg) => void;
  removeLeg: (id: string) => void;
  clearSlip: () => void;
  isOpen: boolean;
  toggleOpen: () => void;
}

const BetSlipContext = createContext<BetSlipContextType>({
  legs: [],
  addLeg: () => {},
  removeLeg: () => {},
  clearSlip: () => {},
  isOpen: false,
  toggleOpen: () => {},
});

export function BetSlipProvider({ children }: { children: ReactNode }) {
  const [legs, setLegs] = useState<BetSlipLeg[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const addLeg = (leg: BetSlipLeg) => {
    setLegs((prev) => {
      const key = `${leg.eventId}-${leg.betType}-${leg.selection}`;
      const exists = prev.find((l) => `${l.eventId}-${l.betType}-${l.selection}` === key);
      if (exists) return prev;
      return [...prev, leg];
    });
    setIsOpen(true);
  };

  const removeLeg = (id: string) => {
    setLegs((prev) => prev.filter((l) => `${l.eventId}-${l.betType}-${l.selection}` !== id));
  };

  const clearSlip = () => setLegs([]);
  const toggleOpen = () => setIsOpen((v) => !v);

  return (
    <BetSlipContext.Provider value={{ legs, addLeg, removeLeg, clearSlip, isOpen, toggleOpen }}>
      {children}
    </BetSlipContext.Provider>
  );
}

export const useBetSlip = () => useContext(BetSlipContext);
