/**
 * Caret and selection utilities for ContentEditable elements.
 * Provides robust character-offset based tracking to prevent cursor jumping.
 */

/**
 * Checks if the given editor element currently has active focus or selection.
 */
export const isEditorActive = (element: HTMLElement | null): boolean => {
  if (!element) return false;
  try {
    const activeEl = document.activeElement;
    if (activeEl && (activeEl === element || element.contains(activeEl))) {
      return true;
    }
    const sel = window.getSelection();
    if (sel && sel.anchorNode && element.contains(sel.anchorNode)) {
      return true;
    }
  } catch {
    // Fallback gracefully
  }
  return false;
};

/**
 * Gets the current caret position as a character offset from the start of the element.
 * Returns -1 if selection is not inside the element.
 */
export const getCaretCharacterOffsetWithin = (element: HTMLElement | null): number => {
  if (!element) return -1;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return -1;

  const range = sel.getRangeAt(0);
  if (!element.contains(range.startContainer)) return -1;

  try {
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.startContainer, range.startOffset);
    return preCaretRange.toString().length;
  } catch {
    return -1;
  }
};

/**
 * Restores caret position based on character offset from the start of the element.
 */
export const setCaretCharacterOffsetWithin = (
  element: HTMLElement | null,
  offset: number,
): void => {
  if (!element || offset < 0) return;
  const sel = window.getSelection();
  if (!sel) return;

  let currentOffset = 0;
  let targetNode: Node | null = null;
  let targetOffsetInNode = 0;

  const treeWalker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null,
  );

  while (treeWalker.nextNode()) {
    const node = treeWalker.currentNode;
    const len = node.nodeValue?.length || 0;
    if (currentOffset + len >= offset) {
      targetNode = node;
      targetOffsetInNode = offset - currentOffset;
      break;
    }
    currentOffset += len;
  }

  try {
    const newRange = document.createRange();
    if (targetNode && targetNode.nodeType === Node.TEXT_NODE) {
      const safeOffset = Math.min(
        Math.max(0, targetOffsetInNode),
        targetNode.nodeValue?.length || 0,
      );
      newRange.setStart(targetNode, safeOffset);
      newRange.collapse(true);
    } else {
      newRange.selectNodeContents(element);
      newRange.collapse(false);
    }
    sel.removeAllRanges();
    sel.addRange(newRange);
  } catch {
    // Fallback gracefully
  }
};
