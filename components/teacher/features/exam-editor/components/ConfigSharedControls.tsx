import React, { useId } from "react";
import { InformationCircleIcon } from "../../../../Icons";
import {
  useExamEditorUIStore,
  type ConfigInfoTopic,
} from "../../../../../stores/examEditorUIStore";

interface InfoIconButtonProps {
  topic: Exclude<ConfigInfoTopic, null>;
  label?: string;
}

export const InfoIconButton: React.FC<InfoIconButtonProps> = ({
  topic,
  label = "Lihat informasi pengaturan",
}) => {
  const setConfigInfoTopic = useExamEditorUIStore(
    (state) => state.setConfigInfoTopic,
  );

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setConfigInfoTopic(topic);
      }}
      className="inline-flex items-center justify-center w-5 h-5 rounded-md text-slate-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors shrink-0 cursor-pointer"
      title={label}
      aria-label={label}
    >
      <InformationCircleIcon className="w-4 h-4" />
    </button>
  );
};

interface CompactSwitchRowProps {
  name?: string;
  label: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  hint?: string;
  infoTopic?: Exclude<ConfigInfoTopic, null>;
  tone?: "indigo" | "rose" | "amber" | "emerald";
  id?: string;
}

export const CompactSwitchRow: React.FC<CompactSwitchRowProps> = ({
  name,
  label,
  checked,
  onChange,
  disabled = false,
  hint,
  infoTopic,
  tone = "indigo",
  id,
}) => {
  const autoId = useId();
  const inputId = id || `${name || "switch"}-${autoId}`;

  const checkedTrackClass =
    tone === "rose"
      ? "peer-checked:bg-rose-600"
      : tone === "amber"
        ? "peer-checked:bg-amber-500"
        : tone === "emerald"
          ? "peer-checked:bg-emerald-600"
          : "peer-checked:bg-indigo-600";

  return (
    <div
      className={`flex items-center justify-between gap-3 py-2.5 px-3 transition-colors ${
        disabled
          ? "opacity-60 bg-slate-50/50 dark:bg-slate-900/20"
          : tone === "rose" && checked
            ? "bg-rose-50/60 dark:bg-rose-950/20"
            : "hover:bg-slate-50/80 dark:hover:bg-slate-700/25"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <label
            htmlFor={inputId}
            className={`text-xs sm:text-[13px] font-semibold leading-snug select-none ${
              disabled
                ? "text-slate-500 dark:text-slate-400 cursor-not-allowed"
                : tone === "rose" && checked
                  ? "text-rose-700 dark:text-rose-300 cursor-pointer"
                  : "text-slate-700 dark:text-slate-200 cursor-pointer"
            }`}
          >
            {label}
          </label>
          {infoTopic && (
            <InfoIconButton
              topic={infoTopic}
              label={`Informasi tentang ${label}`}
            />
          )}
        </div>
        {hint && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
            {hint}
          </p>
        )}
      </div>

      <label
        htmlFor={inputId}
        className={`relative inline-flex items-center shrink-0 select-none ${
          disabled ? "cursor-not-allowed" : "cursor-pointer"
        }`}
      >
        <input
          id={inputId}
          type="checkbox"
          name={name}
          checked={checked}
          disabled={disabled}
          onChange={onChange}
          className="sr-only peer"
        />
        <div
          className={`w-9 h-5 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500/40 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-slate-300 dark:after:border-slate-500 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4 peer-checked:after:border-white ${checkedTrackClass}`}
        />
      </label>
    </div>
  );
};

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  activeClass?: string;
}

interface CompactSegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  fullWidthOnMobile?: boolean;
}

export function CompactSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  fullWidthOnMobile = false,
}: CompactSegmentedControlProps<T>) {
  return (
    <div
      className={`inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-700 ${
        fullWidthOnMobile ? "w-full sm:w-auto" : ""
      }`}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        const activeStyle =
          opt.activeClass ||
          "bg-indigo-600 text-white border-indigo-600 shadow-2xs";
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`${
              fullWidthOnMobile ? "flex-1 sm:flex-initial" : ""
            } px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer border ${
              isActive
                ? activeStyle
                : "bg-transparent border-transparent text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
