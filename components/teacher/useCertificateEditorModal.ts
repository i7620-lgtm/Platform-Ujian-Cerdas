import { useEffect, useRef, useCallback, useState } from "react";
import { processTransparentImage } from "../../utils/imageProcessor";

export interface PositionDef {
  x: number;
  y: number;
  fontSize: number;
  color: string;
  visible: boolean;
}

export interface CertificateSettings {
  enabled: boolean;
  backgroundUrl: string;
  signatureUrl?: string;
  signatureTransparent?: boolean;
  positions: {
    studentName: PositionDef;
    score: PositionDef;
    signature: PositionDef;
  };
}

interface UseCertificateEditorModalProps {
  isOpen: boolean;
  settings?: CertificateSettings;
}

const defaultSettings: CertificateSettings = {
  enabled: true,
  backgroundUrl: "",
  signatureUrl: "",
  signatureTransparent: true,
  positions: {
    studentName: { x: 50, y: 36, fontSize: 50, color: "#1e3a8a", visible: true },
    score: { x: 50, y: 57, fontSize: 40, color: "#ef4444", visible: true },
    signature: { x: 37.4, y: 81, fontSize: 16, color: "#000000", visible: true },
  },
};

export const useCertificateEditorModal = ({
  isOpen,
  settings,
}: UseCertificateEditorModalProps) => {
  const [current, setCurrent] = useState<CertificateSettings | null>(() => {
    if (settings) {
      const parsed = JSON.parse(JSON.stringify(settings));
      if (!parsed.positions.signature) {
        parsed.positions.signature = JSON.parse(JSON.stringify(defaultSettings.positions.signature));
      } else if (parsed.positions.signature.x === 33.7 || parsed.positions.signature.x === 35 || parsed.positions.signature.x === 38 || parsed.positions.signature.y === 85.7 || parsed.positions.signature.x === 50 || parsed.positions.signature.y === 84.6 || parsed.positions.signature.y === 85.5) {
        // Auto-fix old offset issue
        parsed.positions.signature.x = 37.4;
        parsed.positions.signature.y = 81;
      }
      if (parsed.signatureUrl === undefined) {
        parsed.signatureUrl = defaultSettings.signatureUrl;
      }
      if (parsed.signatureTransparent === undefined) {
        parsed.signatureTransparent = defaultSettings.signatureTransparent;
      }
      return parsed;
    }
    return JSON.parse(JSON.stringify(defaultSettings));
  });
  const [activeItem, setActiveItem] = useState<
    keyof CertificateSettings["positions"] | null
  >(null);
  const [bgImageSize, setBgImageSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);

  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const getDefaultSettings = useCallback(() => JSON.parse(JSON.stringify(defaultSettings)), []);

  useEffect(() => {
    if (!isOpen || !wrapperRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const scaleX = width / 1000;
        const scaleY = height / 707;
        setScale(Math.min(scaleX, scaleY, 1));
      }
    });

    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, [isOpen]);

  const [processedSignatureUrl, setProcessedSignatureUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (current?.signatureUrl) {
      if (current.signatureTransparent) {
        processTransparentImage(current.signatureUrl).then(url => {
          if (isMounted) setProcessedSignatureUrl(url);
        });
      } else {
        // use a microtask to avoid synchronous setState warning
        Promise.resolve().then(() => {
          if (isMounted) setProcessedSignatureUrl(current.signatureUrl);
        });
      }
    } else {
      Promise.resolve().then(() => {
        if (isMounted) setProcessedSignatureUrl(null);
      });
    }
    return () => { isMounted = false; };
  }, [current?.signatureUrl, current?.signatureTransparent]);

  const backgroundUrl = current?.backgroundUrl;

  useEffect(() => {
    if (backgroundUrl) {
      const img = new Image();
      img.onload = () => {
        setBgImageSize({ width: img.width, height: img.height });
      };
      img.src = backgroundUrl;
    }
  }, [backgroundUrl]);

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) {
        alert("Ukuran gambar tanda tangan maksimal 1MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        setCurrent((prev) => (prev ? { ...prev, signatureUrl: url } : null));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Ukuran gambar maksimal 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        setCurrent((prev) => (prev ? { ...prev, backgroundUrl: url } : null));
        const img = new Image();
        img.onload = () => {
          setBgImageSize({ width: img.width, height: img.height });
        };
        img.src = url;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragStart = useCallback(
    (item: keyof CertificateSettings["positions"]) => {
      setActiveItem(item);
    },
    [],
  );

  const handleDrag = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    ) => {
      if (!activeItem || !containerRef.current) return;

      if (e.type === "touchmove") {
        if (e.cancelable) e.preventDefault();
      }

      const rect = containerRef.current.getBoundingClientRect();
      let clientX = 0;
      let clientY = 0;

      if ("touches" in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = (e as React.MouseEvent).clientX;
        clientY = (e as React.MouseEvent).clientY;
      }

      const x = ((clientX - rect.left) / rect.width) * 100;
      const y = ((clientY - rect.top) / rect.height) * 100;

      if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
        setCurrent((prev) =>
          prev
            ? {
                ...prev,
                positions: {
                  ...prev.positions,
                  [activeItem]: {
                    ...prev.positions[activeItem],
                    x,
                    y,
                  },
                },
              }
            : null,
        );
      }
    },
    [activeItem],
  );

  const handleDragEnd = useCallback(() => {
    setActiveItem(null);
  }, []);

  const updatePosition = useCallback(
    (
      key: keyof CertificateSettings["positions"],
      field: string,
      value: any,
    ) => {
      setCurrent((prev) =>
        prev
          ? {
              ...prev,
              positions: {
                ...prev.positions,
                [key]: {
                  ...prev.positions[key],
                  [field]: value,
                },
              },
            }
          : null,
      );
    },
    [],
  );

  const updateCurrent = setCurrent;

  return {
    current,
    processedSignatureUrl,
    activeItem,
    bgImageSize,
    scale,
    updateCurrent,
    containerRef,
    wrapperRef,
    handleImageUpload,
    handleSignatureUpload,
    handleDragStart,
    handleDrag,
    handleDragEnd,
    updatePosition,
  };
};
