import React, { useState, useRef, useEffect } from 'react';
import { XMarkIcon, PhotoIcon, SparklesIcon } from '../Icons';

interface PositionDef {
  x: number; y: number; fontSize: number; color: string; visible: boolean;
}

interface CertificateSettings {
  enabled: boolean;
  backgroundUrl: string;
  positions: {
    studentName: PositionDef;
    score: PositionDef;
    examName: PositionDef;
  };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings?: CertificateSettings;
  onSave: (settings: CertificateSettings) => void;
}

export const CertificateEditorModal: React.FC<Props> = ({ isOpen, onClose, settings, onSave }) => {
  const getDefaultSettings = (): CertificateSettings => ({
    enabled: true,
    backgroundUrl: '',
    positions: {
      studentName: { x: 50, y: 45, fontSize: 44, color: '#0f172a', visible: true },
      score: { x: 50, y: 56, fontSize: 24, color: '#ef4444', visible: true },
      examName: { x: 50, y: 74, fontSize: 24, color: '#334155', visible: true }
    }
  });

  const [current, setCurrent] = useState<CertificateSettings>(settings || getDefaultSettings());
  const [activeItem, setActiveItem] = useState<keyof CertificateSettings['positions'] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [bgImageSize, setBgImageSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (isOpen) {
      setCurrent(settings ? JSON.parse(JSON.stringify(settings)) : getDefaultSettings());
    }
  }, [isOpen, settings]);

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
        setCurrent(prev => ({ ...prev, backgroundUrl: url }));
        const img = new Image();
        img.onload = () => {
          setBgImageSize({ width: img.width, height: img.height });
        };
        img.src = url;
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (current.backgroundUrl) {
      const img = new Image();
      img.onload = () => {
        setBgImageSize({ width: img.width, height: img.height });
      };
      img.src = current.backgroundUrl;
    }
  }, [current.backgroundUrl]);

  const handleDragStart = (item: keyof CertificateSettings['positions']) => {
    setActiveItem(item);
  };

  const handleDrag = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!activeItem || !containerRef.current || !current.backgroundUrl) return;
    
    // Default prevent for touch to avoid scrolling
    if (e.type === 'touchmove') {
      if (e.cancelable) e.preventDefault();
    }

    const rect = containerRef.current.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;

    if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
      setCurrent(prev => ({
        ...prev,
        positions: {
          ...prev.positions,
          [activeItem]: {
            ...prev.positions[activeItem],
            x,
            y
          }
        }
      }));
    }
  };

  const handleDragEnd = () => {
    setActiveItem(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <SparklesIcon className="w-5 h-5 text-amber-500" /> Pengaturan Sertifikat Ujian
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Atur template dan teks otomatis pada sertifikat</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-6">
          {/* Controls Sidebar */}
          <div className="w-full md:w-1/3 space-y-6">
            <label className="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 rounded-xl cursor-pointer">
              <input 
                type="checkbox" 
                checked={current.enabled} 
                onChange={e => setCurrent(prev => ({ ...prev, enabled: e.target.checked }))}
                className="rounded border-indigo-300 dark:border-indigo-600 bg-white dark:bg-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-bold text-sm">Aktifkan Sertifikat Otomatis</span>
            </label>

            {current.enabled && (
              <>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-2">Background Sertifikat</h3>
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-200 dark:border-slate-600 border-dashed rounded-xl cursor-pointer bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <PhotoIcon className="w-8 h-8 text-slate-400 mb-2" />
                      <p className="text-sm text-slate-500 dark:text-slate-400"><span className="font-semibold text-indigo-600 dark:text-indigo-400">Klik untuk unggah</span> atau drag</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">JPEG, PNG (Maks 2MB). Landscape direkomendasikan.</p>
                    </div>
                    <input type="file" className="hidden" accept="image/jpeg, image/png" onChange={handleImageUpload} />
                  </label>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">Elemen Cetak</h3>
                  {(['studentName', 'score', 'examName'] as const).map(key => {
                    const lables = { studentName: 'Nama Siswa', score: 'Nilai/Skor', examName: 'Nama Ujian' };
                    return (
                      <div key={key} className="p-3 border border-slate-100 dark:border-slate-700 rounded-xl space-y-2">
                        <label className="flex items-center justify-between text-sm">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{lables[key]}</span>
                          <input 
                            type="checkbox" 
                            checked={current.positions[key].visible}
                            onChange={e => setCurrent(prev => ({
                              ...prev,
                              positions: { ...prev.positions, [key]: { ...prev.positions[key], visible: e.target.checked } }
                            }))}
                            className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                          />
                        </label>
                        {current.positions[key].visible && (
                          <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                            <div className="flex items-center justify-between gap-3">
                              <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 w-16">Ukuran</label>
                              <input 
                                type="number" 
                                value={current.positions[key].fontSize}
                                onChange={e => setCurrent(prev => ({
                                  ...prev,
                                  positions: { ...prev.positions, [key]: { ...prev.positions[key], fontSize: Number(e.target.value) } }
                                }))}
                                className="flex-1 min-w-0 text-sm p-1.5 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg dark:text-white focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 w-16">Warna</label>
                              <div className="flex-1 flex min-w-0 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                                <input 
                                  type="color" 
                                  value={current.positions[key].color}
                                  onChange={e => setCurrent(prev => ({
                                    ...prev,
                                    positions: { ...prev.positions, [key]: { ...prev.positions[key], color: e.target.value } }
                                  }))}
                                  className="w-10 h-8 p-0 border-0 cursor-pointer"
                                />
                                <input 
                                  type="text" 
                                  value={current.positions[key].color}
                                  onChange={e => setCurrent(prev => ({
                                    ...prev,
                                    positions: { ...prev.positions, [key]: { ...prev.positions[key], color: e.target.value } }
                                  }))}
                                  className="flex-1 w-full text-xs p-1.5 px-2 bg-transparent border-0 focus:ring-0 dark:text-white font-mono uppercase"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* Preview Canvas */}
          <div className="flex-1 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center p-4 relative overflow-hidden ring-1 ring-inset ring-slate-200 dark:ring-slate-700">
            {current.enabled ? (
              <div 
                ref={containerRef}
                className={`relative w-full aspect-[1.414/1] shadow-md bg-white select-none touch-none @container ${!current.backgroundUrl ? 'border-[16px] border-double border-slate-200 dark:border-slate-600' : ''}`}
                onMouseMove={activeItem ? handleDrag : undefined}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
                onTouchMove={activeItem ? handleDrag : undefined}
                onTouchEnd={handleDragEnd}
                style={{
                  backgroundImage: current.backgroundUrl ? `url(${current.backgroundUrl})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                {!current.backgroundUrl && (
                  <div className="absolute inset-0 bg-white overflow-hidden pointer-events-none">
                    <div className="absolute inset-[10px] border border-slate-800"></div>
                    <div className="absolute inset-[16px] border-[4px] border-slate-300"></div>
                    
                    {/* Top Left Geometry */}
                    <div className="absolute top-0 left-0 w-[18%] aspect-square bg-slate-900" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}></div>
                    <div className="absolute top-0 left-0 w-[10%] aspect-square bg-blue-600" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}></div>
                    
                    {/* Bottom Right Geometry */}
                    <div className="absolute bottom-0 right-0 w-[18%] aspect-square bg-slate-900" style={{ clipPath: 'polygon(100% 100%, 0 100%, 100% 0)' }}></div>
                    <div className="absolute bottom-0 right-0 w-[10%] aspect-square bg-blue-600" style={{ clipPath: 'polygon(100% 100%, 0 100%, 100% 0)' }}></div>
                    
                    {/* Static Texts */}
                    <div className="absolute top-[28%] left-1/2 -translate-x-1/2 w-full text-center">
                      <h1 className="text-[4cqw] font-serif font-bold text-slate-900 tracking-[0.15em] uppercase">Sertifikat Penghargaan</h1>
                      <p className="text-[1.5cqw] text-slate-500 tracking-[0.2em] mt-3 font-medium">DIBERIKAN KEPADA</p>
                    </div>
                    
                    <div className="absolute top-[65%] left-1/2 -translate-x-1/2 w-full text-center">
                      <p className="text-[1.5cqw] text-slate-600">Atas pencapaian dan kelulusannya pada ujian:</p>
                    </div>

                    <div className="absolute bottom-[10%] right-[10%] w-[20%] text-center border-t border-slate-800 pt-[1cqw]">
                       <p className="text-[1.2cqw] text-slate-800 font-bold">Guru Pengajar</p>
                    </div>
                  </div>
                )}
                {/* Draggable items */}
                {(['studentName', 'score', 'examName'] as const).map(key => {
                  const item = current.positions[key];
                  if (!item.visible) return null;
                  const labels = { studentName: 'Budi Santoso', score: 'Nilai: 100', examName: 'Ujian Tengah Semester' };
                  
                  return (
                    <div
                      key={key}
                      onMouseDown={() => handleDragStart(key)}
                      onTouchStart={() => handleDragStart(key)}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-move select-none whitespace-nowrap p-2 border-2 border-dashed ${activeItem === key ? 'border-sky-500 bg-sky-500/10' : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'}`}
                      style={{
                        left: `${item.x}%`,
                        top: `${item.y}%`,
                        fontSize: `${item.fontSize * 0.118}cqw`, // scaling using container query roughly
                        color: item.color,
                        fontWeight: 'bold',
                      }}
                    >
                      {labels[key]}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-slate-400 dark:text-slate-500">
                <SparklesIcon className="w-12 h-12 mx-auto mb-2 opacity-50 text-indigo-400" />
                <p>Opsi Sertifikat Otomatis Tidak Aktif</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/80">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
            Batal
          </button>
          <button onClick={() => { onSave(current); onClose(); }} className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-sm">
            Simpan Pengaturan
          </button>
        </div>
      </div>
    </div>
  );
};
