import React from "react";
import {
  TrashIcon,
  PhotoIcon,
  SpeakerWaveIcon,
  TableCellsIcon,
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  AlignJustifyIcon,
  StrikethroughIcon,
  SuperscriptIcon,
  SubscriptIcon,
  EraserIcon,
  ListBulletIcon,
  ChartBarIcon,
} from "../Icons";
import type { ChartData } from "../../types";

export const Btn: React.FC<{
  cmd?: string;
  label?: string;
  icon?: React.FC<{ className?: string }>;
  active?: boolean;
  onClick?: () => void;
  runCmd?: (cmd: string) => void;
}> = ({ cmd, label, icon: Icon, active, onClick, runCmd }) => {
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onClick) {
      onClick();
    } else if (cmd && runCmd) {
      runCmd(cmd);
    }
  };

  return (
    <button
      type="button"
      onMouseDown={handleMouseDown}
      className={`min-w-[28px] h-7 px-1.5 rounded flex items-center justify-center transition-all ${active ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 shadow-inner" : "hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-400"}`}
      title={label}
    >
      {Icon ? (
        <Icon className="w-4 h-4" />
      ) : (
        <span className="text-xs font-bold font-serif">{label}</span>
      )}
    </button>
  );
};

interface ToolbarActionsProps {
  activeTab: "FORMAT" | "PARAGRAPH" | "INSERT" | "MATH";
  activeCmds: string[];
  runCmd: (cmd: string, val?: string) => void;
  onAudioClick: () => void;
  onImageClick: () => void;
  onTableClick: () => void;
  onGeometryClick: () => void;
  onChartClick?: () => void;
  onAksaraClick: () => void;
  onEmojiClick: () => void;
  isInsideTable: boolean;
  onDeleteTable: () => void;
  chartData?: ChartData;
  editorRef: React.RefObject<HTMLDivElement>;
  restoreSelection: () => void;
  handleInput: () => void;
}

export const ToolbarActions: React.FC<ToolbarActionsProps> = ({
  activeTab,
  activeCmds,
  runCmd,
  onAudioClick,
  onImageClick,
  onTableClick,
  onGeometryClick,
  onChartClick,
  onAksaraClick,
  onEmojiClick,
  isInsideTable,
  onDeleteTable,
  chartData,
  editorRef,
  restoreSelection,
  handleInput,
}) => {
  if (activeTab === "FORMAT") {
    return (
      <>
        <Btn
          runCmd={runCmd}
          cmd="bold"
          label="B"
          active={activeCmds.includes("bold")}
        />
        <Btn
          runCmd={runCmd}
          cmd="italic"
          label="I"
          active={activeCmds.includes("italic")}
        />
        <Btn
          runCmd={runCmd}
          cmd="underline"
          label="U"
          active={activeCmds.includes("underline")}
        />
        <Btn
          runCmd={runCmd}
          cmd="strikethrough"
          icon={StrikethroughIcon}
          active={activeCmds.includes("strikethrough")}
        />
        <div className="w-px h-4 bg-gray-200 dark:bg-slate-700 mx-1 shrink-0"></div>
        <Btn
          runCmd={runCmd}
          cmd="superscript"
          icon={SuperscriptIcon}
          active={activeCmds.includes("superscript")}
        />
        <Btn
          runCmd={runCmd}
          cmd="subscript"
          icon={SubscriptIcon}
          active={activeCmds.includes("subscript")}
        />
        <div className="w-px h-4 bg-gray-200 dark:bg-slate-700 mx-1 shrink-0"></div>
        <Btn
          runCmd={runCmd}
          cmd="removeFormat"
          icon={EraserIcon}
          label="Clear"
        />
      </>
    );
  }

  if (activeTab === "PARAGRAPH") {
    return (
      <>
        <Btn
          runCmd={runCmd}
          cmd="justifyLeft"
          icon={AlignLeftIcon}
          active={activeCmds.includes("justifyLeft")}
        />
        <Btn
          runCmd={runCmd}
          cmd="justifyCenter"
          icon={AlignCenterIcon}
          active={activeCmds.includes("justifyCenter")}
        />
        <Btn
          runCmd={runCmd}
          cmd="justifyRight"
          icon={AlignRightIcon}
          active={activeCmds.includes("justifyRight")}
        />
        <Btn
          runCmd={runCmd}
          cmd="justifyFull"
          icon={AlignJustifyIcon}
          active={activeCmds.includes("justifyFull")}
        />
        <div className="w-px h-4 bg-gray-200 dark:bg-slate-700 mx-1 shrink-0"></div>
        <Btn
          runCmd={runCmd}
          cmd="insertUnorderedList"
          icon={ListBulletIcon}
          active={activeCmds.includes("insertUnorderedList")}
        />
        <Btn
          runCmd={runCmd}
          cmd="insertOrderedList"
          label="1."
          active={activeCmds.includes("insertOrderedList")}
        />
        <div className="w-px h-4 bg-gray-200 dark:bg-slate-700 mx-1 shrink-0"></div>
        <Btn
          runCmd={runCmd}
          cmd="indent"
          label="Indent"
          icon={() => <span className="text-[10px] font-mono">→]</span>}
        />
        <Btn
          runCmd={runCmd}
          cmd="outdent"
          label="Outdent"
          icon={() => <span className="text-[10px] font-mono">[←</span>}
        />
      </>
    );
  }

  if (activeTab === "INSERT") {
    return (
      <>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onAudioClick();
          }}
          className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors whitespace-nowrap"
        >
          <SpeakerWaveIcon className="w-4 h-4" /> Audio
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onImageClick();
          }}
          className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded text-xs font-bold hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
        >
          <PhotoIcon className="w-4 h-4" /> Gambar
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onTableClick();
          }}
          className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors whitespace-nowrap"
        >
          <TableCellsIcon className="w-4 h-4" /> Tabel
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onGeometryClick();
          }}
          className="flex items-center gap-1.5 px-3 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs font-bold hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors whitespace-nowrap"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2v20 M2 12h20" />
          </svg>{" "}
          Bangun Geometri
        </button>
        {onChartClick && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              const placeholderHtml = `<span class="chart-placeholder" contenteditable="false" data-chart="true" style="display: block; width: 100%; max-width: 600px; min-height: 100px; padding: 10px; background: #f8fafc; border: 2px dashed #cbd5e1; text-align: center; border-radius: 8px; margin: 10px auto; color: #475569; font-weight: bold; cursor: pointer;"><span class="chart-placeholder-text" style="display: block; padding: 40px 0;">📊 Diagram (Klik untuk mengedit)</span></span><br/>`;
              if (
                editorRef.current &&
                !editorRef.current.innerHTML.includes('data-chart="true"')
              ) {
                restoreSelection();
                document.execCommand("insertHTML", false, placeholderHtml);
                handleInput();
              }
              onChartClick();
            }}
            className="flex items-center gap-1.5 px-3 py-1 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 rounded text-xs font-bold hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors whitespace-nowrap"
          >
            <ChartBarIcon className="w-4 h-4" /> Diagram
          </button>
        )}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onAksaraClick();
          }}
          className="flex items-center gap-1.5 px-3 py-1 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded text-xs font-bold hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors whitespace-nowrap"
        >
          <span className="font-serif italic">ᬅ</span> Aksara Bali
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onEmojiClick();
          }}
          className="flex items-center gap-1.5 px-3 py-1 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded text-xs font-bold hover:bg-yellow-105 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 transition-colors whitespace-nowrap"
        >
          <span className="text-[14px]">😀</span> Simbol / Emoji
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            runCmd("insertHorizontalRule");
          }}
          className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-400 rounded text-xs font-bold hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
        >
          —— Pemisah
        </button>
      </>
    );
  }

  return null;
};
