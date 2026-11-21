/**
 * Centralized 5% Platform Adaptation Helper
 * Provides lightweight capability & browser-quirk detection inside the main bundle
 * without splitting application logic into separate OS bundles.
 */

export interface InAppBrowserInfo {
  isInApp: boolean;
  appName: string | null;
}

export interface AntiCheatBlurThresholds {
  softLogDelayMs: number;
  hardLockDelayMs: number;
}

/**
 * Detects whether the active device primarily uses coarse/touch input.
 */
export const isTouchCapableDevice = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) {
      return true;
    }
    return "ontouchstart" in window || (navigator.maxTouchPoints ?? 0) > 0;
  } catch {
    return false;
  }
};

/**
 * Detects iOS / iPadOS WebKit browsers (Safari, Chrome iOS, PWA Home Screen, In-App WebViews).
 * Handles iPadOS 13+ reporting as "Macintosh" with multi-touch points.
 */
export const isIOSWebKit = (): boolean => {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIPhoneOrIPod = /iPhone|iPod/i.test(ua);
  const isIPad =
    /iPad/i.test(ua) ||
    (/Macintosh/i.test(ua) && (navigator.maxTouchPoints ?? 0) > 1);
  return isIPhoneOrIPod || isIPad;
};

/**
 * Detects whether the app is running as an installed PWA (Home Screen / Standalone).
 */
export const isPWAStandalone = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    const standaloneMedia =
      window.matchMedia && window.matchMedia("(display-mode: standalone)").matches;
    const iosStandalone = Boolean(
      (navigator as Navigator & { standalone?: boolean }).standalone,
    );
    return standaloneMedia || iosStandalone;
  } catch {
    return false;
  }
};

/**
 * Detects restricted In-App Browsers (WhatsApp, Instagram, LINE, Facebook, TikTok, Telegram)
 * where camera permissions (QR scanner) or storage isolation frequently break on iOS.
 */
export const detectInAppBrowser = (): InAppBrowserInfo => {
  if (typeof navigator === "undefined") {
    return { isInApp: false, appName: null };
  }
  const ua = navigator.userAgent || "";

  if (/WhatsApp/i.test(ua)) return { isInApp: true, appName: "WhatsApp" };
  if (/Instagram/i.test(ua)) return { isInApp: true, appName: "Instagram" };
  if (/Line\//i.test(ua)) return { isInApp: true, appName: "LINE" };
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return { isInApp: true, appName: "Facebook" };
  if (/BytedanceWebview|musical_ly|TikTok/i.test(ua))
    return { isInApp: true, appName: "TikTok" };
  if (/Telegram/i.test(ua)) return { isInApp: true, appName: "Telegram" };

  return { isInApp: false, appName: null };
};

/**
 * Returns adaptive window.blur tolerances:
 * - Touch/iOS devices get 3s soft-log / 8s hard-lock to avoid false locks from Low Battery popups,
 *   notification banners, or accidental Control Center pulls.
 * - Desktop keeps 1.5s soft-log / 5s hard-lock.
 */
export const getAntiCheatBlurThresholds = (): AntiCheatBlurThresholds => {
  if (isTouchCapableDevice() || isIOSWebKit()) {
    return {
      softLogDelayMs: 3000,
      hardLockDelayMs: 8000,
    };
  }
  return {
    softLogDelayMs: 1500,
    hardLockDelayMs: 5000,
  };
};

/**
 * Saves a Blob cleanly across Desktop, Android, iOS Safari, and iOS Standalone PWA.
 * On iOS WebKit / PWA standalone, tries Web Share API with file attachment first when preferred,
 * falling back to an anchor download with a generous 10s revoke delay.
 */
export const saveBlobCrossPlatform = async ({
  blob,
  fileName,
  title,
  preferShareOnIOS = true,
}: {
  blob: Blob;
  fileName: string;
  title?: string;
  preferShareOnIOS?: boolean;
}): Promise<"shared" | "downloaded" | "cancelled"> => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return "cancelled";
  }

  if (preferShareOnIOS && (isIOSWebKit() || isPWAStandalone())) {
    try {
      const file = new File([blob], fileName, {
        type: blob.type || "application/octet-stream",
      });
      const nav = navigator as Navigator & {
        canShare?: (data?: ShareData) => boolean;
      };
      if (typeof nav.share === "function" && nav.canShare?.({ files: [file] })) {
        await nav.share({
          files: [file],
          title: title || fileName,
        });
        return "shared";
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return "cancelled";
      }
      // Fall through to standard anchor download if Web Share is unavailable or rejected
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Keep blob URL alive long enough (10s) for iOS Safari download sheet to finish reading
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 10000);

  return "downloaded";
};
