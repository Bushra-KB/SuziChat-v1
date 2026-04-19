import { Icon, cx } from "@/components/ui/suzi-primitives";

const attachIcon = "M12 5v14M5 12h14";

const micIcon =
  "M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm7-3a7 7 0 0 1-14 0M12 19v4M8 23h8";

export function ChatComposer({
  attachInputId,
  placeholder = "Type a message…",
  variant = "default",
}: {
  attachInputId: string;
  placeholder?: string;
  variant?: "default" | "onDark";
}) {
  return (
    <div
      className={cx(
        "rounded-[1.05rem] border p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]",
        variant === "onDark"
          ? "border-white/12 bg-[linear-gradient(180deg,rgba(238,242,255,0.14),rgba(224,231,255,0.08))]"
          : "border-slate-200/35 bg-[linear-gradient(180deg,#f4f5ff_0%,#e8ecff_100%)]",
      )}
    >
      <div className="flex items-stretch gap-2 sm:gap-2.5">
        <input id={attachInputId} type="file" className="sr-only" multiple tabIndex={-1} />

        <label
          htmlFor={attachInputId}
          title="Add attachment"
          className={cx(
            "inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-[0.7rem] border border-sky-400/55 bg-[linear-gradient(180deg,#2b5bd3_0%,#172a62_100%)] text-white shadow-[0_2px_8px_rgba(15,23,42,0.28)] transition hover:brightness-110",
            "focus-within:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/90",
          )}
        >
          <Icon path={attachIcon} className="h-[1.05rem] w-[1.05rem] stroke-[2.2]" />
          <span className="sr-only">Add attachment</span>
        </label>

        <div
          className={cx(
            "flex min-h-[2.75rem] min-w-0 flex-1 items-stretch overflow-hidden rounded-[0.75rem] border bg-white shadow-sm",
            variant === "onDark" ? "border-slate-300/85" : "border-slate-200/95",
          )}
        >
          <textarea
            name="message"
            rows={1}
            placeholder={placeholder}
            className="min-h-[2.75rem] w-0 flex-1 resize-none border-0 bg-transparent px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
          />
          <div className="w-px shrink-0 bg-slate-200" aria-hidden />
          <button
            type="button"
            title="Record voice clip"
            className="flex w-11 shrink-0 items-center justify-center text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400/70"
          >
            <Icon path={micIcon} className="h-[1.15rem] w-[1.15rem] stroke-[1.85]" />
            <span className="sr-only">Record voice</span>
          </button>
        </div>

        <button
          type="submit"
          className="inline-flex h-11 min-w-[5.5rem] shrink-0 items-center justify-center rounded-[0.7rem] border border-sky-400/55 bg-[linear-gradient(180deg,#2b5bd3_0%,#172a62_100%)] px-4 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(15,23,42,0.28)] transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/90"
        >
          Send
        </button>
      </div>
    </div>
  );
}
