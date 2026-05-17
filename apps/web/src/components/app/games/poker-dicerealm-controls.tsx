"use client";

type PokerDicerealmControlsProps = {
  disabled: boolean;
  pending?: boolean;
  canCheck: boolean;
  toCall: number;
  amount: number;
  minBet: number;
  maxBet: number;
  currentBet: number;
  onAmountChange: (value: number) => void;
  onFold: () => void;
  onCheck: () => void;
  onCall: () => void;
  onRaise: () => void;
};

function IconFold() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 8l8 8M16 8l-8 8" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M6 12l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCall() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none" />
      <path d="M12 5v2M12 17v2M5 12h2M17 12h2" strokeLinecap="round" />
    </svg>
  );
}

function IconRaise() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 4v16M7 9l5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PokerDicerealmControls({
  disabled,
  pending = false,
  canCheck,
  toCall,
  amount,
  minBet,
  maxBet,
  currentBet,
  onAmountChange,
  onFold,
  onCheck,
  onCall,
  onRaise,
}: PokerDicerealmControlsProps) {
  const sliderMax = Math.max(minBet, maxBet);
  const raiseDisabled = disabled || (currentBet <= 0 && amount < minBet);

  return (
    <div
      className={`suzi-poker-dr-dock ${pending ? "is-pending" : ""}`}
      role="toolbar"
      aria-label="Poker actions"
    >
      <div className="suzi-poker-dr-dock-bar">
        <button
          type="button"
          disabled={disabled}
          className="suzi-poker-dr-action suzi-poker-dr-action--fold"
          onClick={onFold}
        >
          <IconFold />
          <span>Fold</span>
        </button>
        <button
          type="button"
          disabled={disabled || !canCheck}
          className="suzi-poker-dr-action suzi-poker-dr-action--check"
          onClick={onCheck}
        >
          <IconCheck />
          <span>Check</span>
        </button>
        <button
          type="button"
          disabled={disabled || canCheck}
          className="suzi-poker-dr-action suzi-poker-dr-action--call"
          onClick={onCall}
        >
          <IconCall />
          <span>{toCall > 0 ? `Call ${toCall}` : "Call"}</span>
        </button>
        <button
          type="button"
          disabled={raiseDisabled}
          className="suzi-poker-dr-action suzi-poker-dr-action--raise"
          onClick={onRaise}
        >
          <IconRaise />
          <span>Raise</span>
        </button>

        <div className="suzi-poker-dr-bet-panel">
          <span className="suzi-poker-dr-bet-currency">$</span>
          <input
            type="range"
            min={minBet}
            max={sliderMax}
            step={Math.max(1, Math.floor((sliderMax - minBet) / 50) || 1)}
            value={Math.min(amount, sliderMax)}
            disabled={disabled}
            className="suzi-poker-dr-bet-slider"
            onChange={(e) => onAmountChange(Number(e.target.value))}
          />
          <output className="suzi-poker-dr-bet-out">{amount.toLocaleString()}</output>
        </div>
      </div>
    </div>
  );
}
