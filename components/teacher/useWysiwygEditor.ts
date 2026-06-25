import { useRef, useEffect, useState } from "react";
import { compressImage, sanitizeHtml } from "./examUtils";

export type WysiwygTab = "FORMAT" | "PARAGRAPH" | "INSERT" | "MATH";

export interface EditorState {
  activeTab: WysiwygTab;
  activeCmds: string[];
  isInsideTable: boolean;
  showMath: boolean;
  showTable: boolean;
  showGeometry: boolean;
  showAksara: boolean;
  showEmoji: boolean;
}

const execCmd = (command: string, value: string | undefined = undefined) => {
  document.execCommand(command, false, value);
};

interface UseWysiwygEditorParams {
  value: string;
  onChange: (val: string) => void;
  showTabs: boolean;
  onChartClick?: () => void;
  chartData?: any;
}

export const useWysiwygEditor = ({
  value,
  onChange,
  showTabs,
  onChartClick,
  chartData,
}: UseWysiwygEditorParams) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const savedRange = useRef<Range | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const defaultTab: WysiwygTab = showTabs ? "FORMAT" : "INSERT";

  const [state, setState] = useState<EditorState>({
    activeTab: defaultTab,
    activeCmds: [],
    isInsideTable: false,
    showMath: false,
    showTable: false,
    showGeometry: false,
    showAksara: false,
    showEmoji: false,
  });

  const setEditorSubState = (
    updater:
      | Partial<EditorState>
      | ((prev: EditorState) => Partial<EditorState>),
  ) => {
    setState((prev) =>
      typeof updater === "function"
        ? { ...prev, ...updater(prev) }
        : { ...prev, ...updater },
    );
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleInput = () => {
    if (editorRef.current) {
      const clone = editorRef.current.cloneNode(true) as HTMLElement;
      const chartNodes = clone.querySelectorAll('[data-chart="true"]');
      chartNodes.forEach((node) => {
        node.innerHTML = `<span class="chart-placeholder-text">📊 Diagram (Klik untuk mengedit)</span>`;
      });
      const html = clone.innerHTML;

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChange(sanitizeHtml(html));
      }, 1000);

      saveSelection();
      checkActiveFormats();
    }
  };

  const handleBlur = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
      if (editorRef.current) {
        const clone = editorRef.current.cloneNode(true) as HTMLElement;
        const chartNodes = clone.querySelectorAll('[data-chart="true"]');
        chartNodes.forEach((node) => {
          node.innerHTML = `<span class="chart-placeholder-text">📊 Diagram (Klik untuk mengedit)</span>`;
        });
        const html = clone.innerHTML;
        onChange(sanitizeHtml(html));
      }
    }
    saveSelection();
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (
      sel &&
      sel.rangeCount > 0 &&
      editorRef.current?.contains(sel.anchorNode)
    ) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    if (editorRef.current) editorRef.current.focus();
    const sel = window.getSelection();
    if (sel && savedRange.current) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    } else if (editorRef.current && sel) {
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  const checkActiveFormats = () => {
    saveSelection();
    const cmds = [
      "bold",
      "italic",
      "underline",
      "strikethrough",
      "subscript",
      "superscript",
      "justifyLeft",
      "justifyCenter",
      "justifyRight",
      "justifyFull",
      "insertUnorderedList",
      "insertOrderedList",
    ];
    const active = cmds.filter((cmd) => document.queryCommandState(cmd));

    let inTable = false;
    const selection = window.getSelection();
    if (
      selection &&
      selection.rangeCount > 0 &&
      editorRef.current?.contains(selection.anchorNode)
    ) {
      let node = selection.anchorNode;
      while (node && node !== editorRef.current) {
        if (
          node.nodeName === "TABLE" ||
          node.nodeName === "TD" ||
          node.nodeName === "TH"
        ) {
          inTable = true;
          break;
        }
        node = node.parentNode;
      }
    }

    setEditorSubState({
      activeCmds: active,
      isInsideTable: inTable,
    });
  };

  const handleEditorClick = (e: React.MouseEvent) => {
    checkActiveFormats();
    const target = e.target as HTMLElement;
    if (target.closest(".chart-placeholder") && onChartClick) {
      onChartClick();
    }
  };

  const runCmd = (cmd: string, val?: string) => {
    if (document.activeElement !== editorRef.current) {
      restoreSelection();
    }
    if (editorRef.current) editorRef.current.focus();

    if (cmd === "superscript") {
      if (document.queryCommandState("subscript")) execCmd("subscript");
      execCmd("superscript");
    } else if (cmd === "subscript") {
      if (document.queryCommandState("superscript")) execCmd("superscript");
      execCmd("subscript");
    } else {
      execCmd(cmd, val);
    }
    checkActiveFormats();
  };

  const insertTable = (rows: number, cols: number) => {
    let html =
      '<div class="overflow-x-auto custom-scrollbar"><table><thead><tr>';
    for (let c = 0; c < cols; c++) html += `<th>H${c + 1}</th>`;
    html += "</tr></thead><tbody>";
    for (let r = 0; r < rows; r++) {
      html += "<tr>";
      for (let c = 0; c < cols; c++) html += `<td>Data</td>`;
      html += "</tr>";
    }
    html += "</tbody></table></div><p><br/></p>";
    runCmd("insertHTML", html);
    handleInput();
  };

  const deleteCurrentTable = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      let node = selection.anchorNode;
      while (node && node !== editorRef.current) {
        if (node.nodeName === "TABLE") {
          node.parentNode?.removeChild(node);
          handleInput();
          setEditorSubState({ isInsideTable: false });
          return;
        }
        node = node.parentNode;
      }
    }
  };

  const insertMath = (latex: string) => {
    const mathGlobal = window as any;
    if (mathGlobal.katex) {
      const html = mathGlobal.katex.renderToString(latex, {
        throwOnError: false,
        displayMode: false,
      });

      if (document.activeElement !== editorRef.current) {
        restoreSelection();
      }
      if (editorRef.current) editorRef.current.focus();

      const sel = window.getSelection();
      if (
        sel &&
        sel.rangeCount > 0 &&
        editorRef.current &&
        editorRef.current.contains(sel.anchorNode)
      ) {
        const range = sel.getRangeAt(0);
        range.deleteContents();

        const span = document.createElement("span");
        span.className = "math-visual";
        span.style.display = "inline-block";
        span.style.verticalAlign = "middle";
        span.contentEditable = "false";
        span.setAttribute("data-latex", latex);
        span.innerHTML = html;

        const zws1 = document.createTextNode("\u200B");
        const zws2 = document.createTextNode("\u200B");

        const frag = document.createDocumentFragment();
        frag.appendChild(zws1);
        frag.appendChild(span);
        frag.appendChild(zws2);

        range.insertNode(frag);
        range.setStartAfter(zws2);
        range.setEndAfter(zws2);
        sel.removeAllRanges();
        sel.addRange(range);

        checkActiveFormats();
      } else {
        const wrapper = `&#8203;<span class="math-visual" style="display: inline-block; vertical-align: middle;" contenteditable="false" data-latex="${latex.replace(/"/g, "&quot;")}">${html}</span>&#8203;`;
        runCmd("insertHTML", wrapper);
      }
      handleInput();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const items = e.clipboardData.items;
    let imagePasted = false;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          imagePasted = true;
          if (document.activeElement !== editorRef.current) {
            editorRef.current?.focus();
            restoreSelection();
          }
          const reader = new FileReader();
          reader.onload = async (ev) => {
            const rawDataUrl = ev.target?.result as string;
            try {
              const dataUrl = await compressImage(rawDataUrl, 0.7);
              const imgTag = `<img src="${dataUrl}" alt="Inserted Image" style="max-width: 100%; max-height: 50vh; width: auto; height: auto; object-fit: contain; border-radius: 8px; margin: 8px 0;" />&nbsp;`;
              document.execCommand("insertHTML", false, imgTag);
              handleInput();
            } catch (error) {
              console.error("Image compression failed", error);
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }

    if (imagePasted) return;

    const text = e.clipboardData.getData("text/plain");
    const html = e.clipboardData.getData("text/html");

    let content = text;
    if (html) {
      content = sanitizeHtml(html);
    }
    document.execCommand("insertHTML", false, content);
    handleInput();
  };

  const handleImageFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const rawDataUrl = ev.target?.result as string;
        try {
          const dataUrl = await compressImage(rawDataUrl, 0.7);
          const imgTag = `<img src="${dataUrl}" alt="Inserted Image" style="max-width: 100%; max-height: 50vh; width: auto; height: auto; object-fit: contain; border-radius: 8px; margin: 8px 0;" />&nbsp;`;
          runCmd("insertHTML", imgTag);
          handleInput();
        } catch (error) {
          console.error("Image compression failed", error);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 1 * 1024 * 1024) {
        alert("Ukuran file audio terlalu besar (Maks 1MB)");
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        const audioTag = `<br/><audio controls src="${result}" style="max-width: 100%; display: block; margin: 8px 0;"></audio><br/>`;
        runCmd("insertHTML", audioTag);
        handleInput();
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  return {
    editorRef,
    fileInputRef,
    audioInputRef,
    state,
    setEditorSubState,
    handleInput,
    handleBlur,
    checkActiveFormats,
    handleEditorClick,
    runCmd,
    insertTable,
    deleteCurrentTable,
    insertMath,
    handlePaste,
    handleImageFileChange,
    handleAudioFileChange,
    restoreSelection,
  };
};
