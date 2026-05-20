
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChartData } from '../../types';
import { XMarkIcon, PlusCircleIcon, TrashIcon } from '../Icons';

interface ChartConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ChartData) => void;
  onDelete?: () => void;
  initialData?: ChartData;
}

export const ChartConfigModal: React.FC<ChartConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData
}) => {
  const [type, setType] = useState<'bar' | 'line' | 'pie' | 'venn' | 'relation' | 'cartesian'>('bar');
  const [title, setTitle] = useState('');
  const [labels, setLabels] = useState<string[]>(['Jan', 'Feb', 'Mar']);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [datasets, setDatasets] = useState<{ label: string; data: (number | string | any)[]; backgroundColor?: string[]; borderColor?: string[]; showLine?: boolean; fill?: boolean; isFunction?: boolean; functionStr?: string; }[]>([
    { label: 'Data 1', data: [10, 20, 30] }
  ]);
  const [showTooltip, setShowTooltip] = useState<boolean>(true);
  const [showLegend, setShowLegend] = useState<boolean>(true);
  const [cartesianConfig, setCartesianConfig] = useState({
    xMin: -10, xMax: 10, yMin: -10, yMax: 10, xStep: 1, yStep: 1
  });

  useEffect(() => {
    if (initialData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setType(initialData.type);
      setTitle(initialData.title || '');
      setLabels(initialData.labels);
      setDatasets(initialData.datasets.map(d => ({ 
        label: d.label, 
        data: d.data,
        backgroundColor: d.backgroundColor,
        borderColor: d.borderColor,
        showLine: d.showLine,
        fill: d.fill,
        isFunction: d.isFunction,
        functionStr: d.functionStr
      })));
      setShowTooltip(initialData.showTooltip !== false);
      setShowLegend(initialData.showLegend !== false);
      if (initialData.cartesianConfig) {
        setCartesianConfig(initialData.cartesianConfig);
      }
    }
  }, [initialData, isOpen]);

  const handleTypeChange = (newType: string) => {
    setType(newType as 'bar' | 'line' | 'pie' | 'venn' | 'relation' | 'cartesian');
    if (newType === 'venn') {
       if (labels.length !== 2 && labels.length !== 3) {
         setLabels(['A', 'B']);
         setDatasets([{ label: 'Data', data: ['', '', '', '', ''] }]);
       }
    } else if (newType === 'relation') {
       setLabels(['A', 'B']);
       setDatasets([
         { label: 'Domain', data: ['1', '2', '3'] },
         { label: 'Kodomain', data: ['a', 'b', 'c'] },
         { label: 'Relasi', data: ['0-0', '1-1', '2-2'] }
       ]);
    } else if (newType === 'cartesian') {
       setLabels(['X', 'Y']);
       setDatasets([
         { label: 'Titik Data', data: [], backgroundColor: ['#3b82f6'], showLine: false }
       ]);
    }
  };

  if (!isOpen) return null;

  const handleAddLabel = () => {
    setLabels([...labels, `Label ${labels.length + 1}`]);
    setDatasets(datasets.map(d => ({ ...d, data: [...d.data, 0] })));
  };

  const handleDeleteLabel = (index: number) => {
    if (labels.length <= 1) return;
    const newLabels = [...labels];
    newLabels.splice(index, 1);
    setLabels(newLabels);
    setDatasets(datasets.map(d => {
      const newData = [...d.data];
      newData.splice(index, 1);
      return { ...d, data: newData };
    }));
  };

  const handleAddDataset = () => {
    setDatasets([...datasets, { label: `Data ${datasets.length + 1}`, data: labels.map(() => 0) }]);
  };

  const handleDeleteDataset = (index: number) => {
    if (datasets.length <= 1) return;
    const newDatasets = [...datasets];
    newDatasets.splice(index, 1);
    setDatasets(newDatasets);
  };

  const handleSave = () => {
    onSave({
      type,
      title,
      labels,
      datasets,
      showTooltip,
      showLegend,
      ...(type === 'cartesian' ? { cartesianConfig } : {})
    });
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Konfigurasi Diagram</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <XMarkIcon className="w-6 h-6 text-gray-500 dark:text-slate-400" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Judul Diagram</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2 border dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-800 dark:text-white dark:placeholder-slate-400"
                placeholder="Contoh: Penjualan Bulanan"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Jenis Diagram</label>
              <select
                value={type}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="w-full p-2 border dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-800 dark:text-white"
              >
                <option value="bar">Diagram Batang (Bar)</option>
                <option value="line">Diagram Garis (Line)</option>
                <option value="pie">Diagram Lingkaran (Pie)</option>
                <option value="venn">Diagram Venn Himpunan</option>
                <option value="relation">Diagram Relasi / Fungsi</option>
                <option value="cartesian">Diagram Kartesius</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showTooltip"
                checked={showTooltip}
                onChange={(e) => setShowTooltip(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <label htmlFor="showTooltip" className="text-sm font-medium text-gray-700 dark:text-slate-300">
                Tampilkan Tooltip (Kotak Info saat disentuh/hover)
              </label>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showLegend"
                checked={showLegend}
                onChange={(e) => setShowLegend(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <label htmlFor="showLegend" className="text-sm font-medium text-gray-700 dark:text-slate-300">
                Tampilkan Legend / Keterangan Warna
              </label>
            </div>
          </div>

          {type === 'relation' ? (
            <div className="space-y-4 bg-gray-50 dark:bg-slate-800/30 p-4 rounded-xl border dark:border-slate-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Nama Himpunan 1 (Domain)</label>
                  <input type="text" value={labels[0] || ''} onChange={e => { const newL = [...labels]; newL[0] = e.target.value; setLabels(newL); }} className="w-full p-2 border rounded focus:ring-1 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Nama Himpunan 2 (Kodomain)</label>
                  <input type="text" value={labels[1] || ''} onChange={e => { const newL = [...labels]; newL[1] = e.target.value; setLabels(newL); }} className="w-full p-2 border rounded focus:ring-1 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white font-bold" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-slate-500">Anggota Domain</label>
                    <button onClick={() => {
                      const newD = [...datasets];
                      if (!newD[0]) newD[0] = { label: 'Domain', data: [] };
                      newD[0].data.push('');
                      setDatasets(newD);
                    }} className="text-xs text-blue-600 font-bold">+ Tambah</button>
                  </div>
                  <div className="space-y-2">
                    {datasets[0]?.data.map((item, idx) => (
                      <div key={`dom-${idx}`} className="flex gap-2">
                        <input type="text" value={item} onChange={e => {
                          const newD = [...datasets]; newD[0].data[idx] = e.target.value; setDatasets(newD);
                        }} className="flex-1 p-1 text-sm border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                        <button onClick={() => {
                          const newD = [...datasets]; newD[0].data.splice(idx, 1); setDatasets(newD);
                        }} className="text-red-500 hover:text-red-700 font-bold px-2">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-slate-500">Anggota Kodomain</label>
                    <button onClick={() => {
                      const newD = [...datasets];
                      if (!newD[1]) newD[1] = { label: 'Kodomain', data: [] };
                      newD[1].data.push('');
                      setDatasets(newD);
                    }} className="text-xs text-blue-600 font-bold">+ Tambah</button>
                  </div>
                  <div className="space-y-2">
                    {datasets[1]?.data.map((item, idx) => (
                      <div key={`codom-${idx}`} className="flex gap-2">
                        <input type="text" value={item} onChange={e => {
                          const newD = [...datasets]; newD[1].data[idx] = e.target.value; setDatasets(newD);
                        }} className="flex-1 p-1 text-sm border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                        <button onClick={() => {
                          const newD = [...datasets]; newD[1].data.splice(idx, 1); setDatasets(newD);
                        }} className="text-red-500 hover:text-red-700 font-bold px-2">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t dark:border-slate-700">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">Relasi Pemetaan</label>
                  <button onClick={() => {
                    const newD = [...datasets];
                    if (!newD[2]) newD[2] = { label: 'Relasi', data: [] };
                    newD[2].data.push('0-0');
                    setDatasets(newD);
                  }} className="text-sm bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-bold hover:bg-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-400">+ Tambah Relasi</button>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {datasets[2]?.data.map((rel, idx) => {
                    const [dIdx, cIdx] = String(rel).split('-');
                    return (
                      <div key={`rel-${idx}`} className="flex gap-2 items-center bg-white dark:bg-slate-800 p-2 rounded border dark:border-slate-700">
                        <select value={dIdx} onChange={e => {
                          const newD = [...datasets]; newD[2].data[idx] = `${e.target.value}-${cIdx}`; setDatasets(newD);
                        }} className="flex-1 p-1 text-sm border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                          <option value="">Pilih Domain</option>
                          {datasets[0]?.data.map((item, i) => (
                            <option key={`d-${i}`} value={i}>{item}</option>
                          ))}
                        </select>
                        <span className="text-slate-400 font-bold">→</span>
                        <select value={cIdx} onChange={e => {
                          const newD = [...datasets]; newD[2].data[idx] = `${dIdx}-${e.target.value}`; setDatasets(newD);
                        }} className="flex-1 p-1 text-sm border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                          <option value="">Pilih Kodomain</option>
                          {datasets[1]?.data.map((item, i) => (
                            <option key={`c-${i}`} value={i}>{item}</option>
                          ))}
                        </select>
                        <button onClick={() => {
                          const newD = [...datasets]; newD[2].data.splice(idx, 1); setDatasets(newD);
                        }} className="text-red-500 hover:text-red-700 font-bold px-2">✕</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : type === 'cartesian' ? (
            <div className="space-y-4 bg-gray-50 dark:bg-slate-800/30 p-4 rounded-xl border dark:border-slate-700">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">X Min</label>
                  <input type="number" value={cartesianConfig.xMin} onChange={e => setCartesianConfig({...cartesianConfig, xMin: parseFloat(e.target.value) || 0})} className="w-full p-2 border rounded focus:ring-1 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">X Max</label>
                  <input type="number" value={cartesianConfig.xMax} onChange={e => setCartesianConfig({...cartesianConfig, xMax: parseFloat(e.target.value) || 0})} className="w-full p-2 border rounded focus:ring-1 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Y Min</label>
                  <input type="number" value={cartesianConfig.yMin} onChange={e => setCartesianConfig({...cartesianConfig, yMin: parseFloat(e.target.value) || 0})} className="w-full p-2 border rounded focus:ring-1 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Y Max</label>
                  <input type="number" value={cartesianConfig.yMax} onChange={e => setCartesianConfig({...cartesianConfig, yMax: parseFloat(e.target.value) || 0})} className="w-full p-2 border rounded focus:ring-1 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                </div>
              </div>

              <div className="mt-4 pt-4 border-t dark:border-slate-700">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">Titik / Garis Data</label>
                  <button onClick={() => {
                    const newD = [...datasets];
                    newD.push({ label: `Dataset ${datasets.length + 1}`, data: [], backgroundColor: ['#3b82f6'], showLine: false });
                    setDatasets(newD);
                  }} className="text-sm bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-bold hover:bg-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-400">+ Tambah Dataset</button>
                </div>
                
                <div className="space-y-4">
                  {datasets.map((ds, idx) => (
                    <div key={`ds-${idx}`} className="bg-white dark:bg-slate-800 p-3 rounded border dark:border-slate-700">
                      <div className="flex gap-2 items-center mb-3">
                        <input type="text" value={ds.label || ''} onChange={e => {
                          const newD = [...datasets]; newD[idx].label = e.target.value; setDatasets(newD);
                        }} className="flex-1 p-1 text-sm border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white font-bold" />
                        
                        <label className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                          <input type="checkbox" checked={ds.showLine || false} onChange={e => {
                            const newD = [...datasets]; newD[idx].showLine = e.target.checked; setDatasets(newD);
                          }} className="w-3 h-3 rounded" />
                          Garis?
                        </label>

                        <button onClick={() => {
                          const newD = [...datasets]; newD.splice(idx, 1); setDatasets(newD);
                        }} className="text-red-500 hover:text-red-700 font-bold px-2">✕</button>
                      </div>

                      <div className="flex gap-4 items-center mb-2">
                        <label className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          <input type="checkbox" checked={ds.isFunction || false} onChange={e => {
                            const newD = [...datasets]; newD[idx].isFunction = e.target.checked; setDatasets(newD);
                          }} className="w-3 h-3 rounded text-indigo-600" />
                          Gunakan Rumus Fungsi f(x)
                        </label>
                      </div>

                      {ds.isFunction ? (
                        <div className="mb-2">
                          <label className="text-xs font-bold text-slate-500">Rumus f(x) (misal: x^2 - 2*x + 1 atau Math.sin(x))</label>
                          <input type="text" value={ds.functionStr || ''} onChange={e => {
                            const newD = [...datasets]; newD[idx].functionStr = e.target.value; setDatasets(newD);
                          }} placeholder="x^2 - 2*x + 1" className="w-full p-2 mt-1 text-sm font-mono border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-bold text-slate-500">Titik Koordinat (x, y)</label>
                            <button onClick={() => {
                              const newD = [...datasets];
                              newD[idx].data.push({ x: 0, y: 0 });
                              setDatasets(newD);
                            }} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-bold hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300">+ Tambah Titik</button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            {ds.data.map((pt, pIdx) => (
                              <div key={`pt-${idx}-${pIdx}`} className="flex gap-1 items-center bg-slate-50 dark:bg-slate-700/50 p-1 rounded border dark:border-slate-600">
                                <span className="text-xs font-mono text-slate-400 pl-1">(</span>
                                <input type="number" value={pt.x || 0} onChange={e => {
                                  const newD = [...datasets]; newD[idx].data[pIdx] = { ...newD[idx].data[pIdx], x: parseFloat(e.target.value) || 0 }; setDatasets(newD);
                                }} className="w-12 p-0.5 text-xs text-center border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white" />
                                <span className="text-xs font-mono text-slate-400">,</span>
                                <input type="number" value={pt.y || 0} onChange={e => {
                                  const newD = [...datasets]; newD[idx].data[pIdx] = { ...newD[idx].data[pIdx], y: parseFloat(e.target.value) || 0 }; setDatasets(newD);
                                }} className="w-12 p-0.5 text-xs text-center border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white" />
                                <span className="text-xs font-mono text-slate-400">)</span>
                                <button onClick={() => {
                                  const newD = [...datasets]; newD[idx].data.splice(pIdx, 1); setDatasets(newD);
                                }} className="ml-auto text-red-400 hover:text-red-600 font-bold px-1 text-xs">✕</button>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : type === 'venn' ? (
            <div className="space-y-4 bg-gray-50 dark:bg-slate-800/30 p-4 rounded-xl border dark:border-slate-700">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-gray-700 dark:text-slate-200">Data Diagram Venn</h3>
                 <div className="flex gap-2">
                   <button onClick={() => { setLabels(['A', 'B']); setDatasets([{ label: 'Data', data: ['', '', '', '', ''] }]); }} className={`px-3 py-1 rounded text-sm ${labels.length !== 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-slate-700 dark:text-slate-300'}`}>2 Himpunan</button>
                   <button onClick={() => { setLabels(['A', 'B', 'C']); setDatasets([{ label: 'Data', data: ['', '', '', '', '', '', '', '', ''] }]); }} className={`px-3 py-1 rounded text-sm ${labels.length === 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-slate-700 dark:text-slate-300'}`}>3 Himpunan</button>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-bold text-slate-500 mb-1">Total Semesta (S)</label>
                   <input type="text" value={datasets[0]?.data[labels.length === 3 ? 8 : 4] || ''} onChange={e => {
                     const newD = [...(datasets[0]?.data || [])];
                     newD[labels.length === 3 ? 8 : 4] = e.target.value;
                     const newDatasets = [...datasets];
                     if (!newDatasets[0]) newDatasets[0] = { label: 'Data', data: [] };
                     newDatasets[0].data = newD;
                     setDatasets(newDatasets);
                   }} className="w-full p-2 border rounded focus:ring-1 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-500 mb-1">Nilai di Luar Himpunan</label>
                   <input type="text" value={datasets[0]?.data[labels.length === 3 ? 7 : 3] || ''} onChange={e => {
                     const newD = [...(datasets[0]?.data || [])];
                     newD[labels.length === 3 ? 7 : 3] = e.target.value;
                     const newDatasets = [...datasets];
                     if (!newDatasets[0]) newDatasets[0] = { label: 'Data', data: [] };
                     newDatasets[0].data = newD;
                     setDatasets(newDatasets);
                   }} className="w-full p-2 border rounded focus:ring-1 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                </div>
              </div>

              <div className="space-y-3 mt-4">
                <h4 className="font-bold text-sm text-slate-600 dark:text-slate-300 border-b dark:border-slate-700 pb-1">Himpunan</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                     <input type="text" placeholder="Nama Himpunan 1" value={labels[0] || 'A'} onChange={e => {
                       const newL = [...labels]; newL[0] = e.target.value; setLabels(newL);
                     }} className="w-full p-2 text-sm border rounded focus:ring-1 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white font-bold" />
                     <label className="text-xs text-slate-500">Nilai Hanya {labels[0] || 'A'}</label>
                     <input type="text" value={datasets[0]?.data[0] ?? ''} onChange={e => {
                       const newD = [...(datasets[0]?.data || [])]; newD[0] = e.target.value;
                       const newDatasets = [...datasets]; if (!newDatasets[0]) newDatasets[0] = { label: 'Data', data: [] }; newDatasets[0].data = newD; setDatasets(newDatasets);
                     }} className="w-full p-2 border rounded focus:ring-1 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                  </div>
                  <div className="flex flex-col gap-1">
                     <input type="text" placeholder="Nama Himpunan 2" value={labels[1] || 'B'} onChange={e => {
                       const newL = [...labels]; newL[1] = e.target.value; setLabels(newL);
                     }} className="w-full p-2 text-sm border rounded focus:ring-1 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white font-bold" />
                     <label className="text-xs text-slate-500">Nilai Hanya {labels[1] || 'B'}</label>
                     <input type="text" value={datasets[0]?.data[1] ?? ''} onChange={e => {
                       const newD = [...(datasets[0]?.data || [])]; newD[1] = e.target.value;
                       const newDatasets = [...datasets]; if (!newDatasets[0]) newDatasets[0] = { label: 'Data', data: [] }; newDatasets[0].data = newD; setDatasets(newDatasets);
                     }} className="w-full p-2 border rounded focus:ring-1 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                  </div>
                  {labels.length === 3 && (
                    <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                       <input type="text" placeholder="Nama Himpunan 3" value={labels[2] || 'C'} onChange={e => {
                         const newL = [...labels]; newL[2] = e.target.value; setLabels(newL);
                       }} className="w-full p-2 text-sm border rounded focus:ring-1 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white font-bold" />
                       <label className="text-xs text-slate-500">Nilai Hanya {labels[2] || 'C'}</label>
                       <input type="text" value={datasets[0]?.data[2] ?? ''} onChange={e => {
                         const newD = [...(datasets[0]?.data || [])]; newD[2] = e.target.value;
                         const newDatasets = [...datasets]; if (!newDatasets[0]) newDatasets[0] = { label: 'Data', data: [] }; newDatasets[0].data = newD; setDatasets(newDatasets);
                       }} className="w-full p-2 border rounded focus:ring-1 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3 mt-4">
                <h4 className="font-bold text-sm text-slate-600 dark:text-slate-300 border-b dark:border-slate-700 pb-1">Irisan</h4>
                <div className="grid grid-cols-2 gap-4">
                   <div className="flex flex-col gap-1">
                      <label className="text-xs text-slate-500">Irisan {labels[0] || 'A'} & {labels[1] || 'B'}</label>
                      <input type="text" value={datasets[0]?.data[labels.length === 3 ? 3 : 2] ?? ''} onChange={e => {
                        const newD = [...(datasets[0]?.data || [])]; newD[labels.length === 3 ? 3 : 2] = e.target.value;
                        const newDatasets = [...datasets]; if (!newDatasets[0]) newDatasets[0] = { label: 'Data', data: [] }; newDatasets[0].data = newD; setDatasets(newDatasets);
                      }} className="w-full p-2 border rounded focus:ring-1 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                   </div>
                   {labels.length === 3 && (
                     <>
                       <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-500">Irisan {labels[0] || 'A'} & {labels[2] || 'C'}</label>
                          <input type="text" value={datasets[0]?.data[4] ?? ''} onChange={e => {
                            const newD = [...(datasets[0]?.data || [])]; newD[4] = e.target.value;
                            const newDatasets = [...datasets]; if (!newDatasets[0]) newDatasets[0] = { label: 'Data', data: [] }; newDatasets[0].data = newD; setDatasets(newDatasets);
                          }} className="w-full p-2 border rounded focus:ring-1 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                       </div>
                       <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-500">Irisan {labels[1] || 'B'} & {labels[2] || 'C'}</label>
                          <input type="text" value={datasets[0]?.data[5] ?? ''} onChange={e => {
                            const newD = [...(datasets[0]?.data || [])]; newD[5] = e.target.value;
                            const newDatasets = [...datasets]; if (!newDatasets[0]) newDatasets[0] = { label: 'Data', data: [] }; newDatasets[0].data = newD; setDatasets(newDatasets);
                          }} className="w-full p-2 border rounded focus:ring-1 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                       </div>
                       <div className="flex flex-col gap-1 col-span-2">
                          <label className="text-xs text-slate-500 font-bold">Irisan Ketiganya ({labels[0] || 'A'}, {labels[1] || 'B'} & {labels[2] || 'C'})</label>
                          <input type="text" value={datasets[0]?.data[6] ?? ''} onChange={e => {
                            const newD = [...(datasets[0]?.data || [])]; newD[6] = e.target.value;
                            const newDatasets = [...datasets]; if (!newDatasets[0]) newDatasets[0] = { label: 'Data', data: [] }; newDatasets[0].data = newD; setDatasets(newDatasets);
                          }} className="w-full p-2 border rounded focus:ring-1 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                       </div>
                     </>
                   )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-700 dark:text-slate-200">Label & Data</h3>
                <div className="space-x-2">
                  <button
                    onClick={handleAddLabel}
                    className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-600 dark:text-white rounded-lg text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors flex items-center gap-1 inline-flex"
                  >
                    <PlusCircleIcon className="w-4 h-4" /> Tambah Label
                  </button>
                  {type !== 'pie' && (
                    <button
                      onClick={handleAddDataset}
                      className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-600 dark:text-white rounded-lg text-sm font-medium hover:bg-green-200 dark:hover:bg-green-700 transition-colors flex items-center gap-1 inline-flex"
                    >
                      <PlusCircleIcon className="w-4 h-4" /> Tambah Dataset
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto border dark:border-slate-700 rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-800/50 border-b dark:border-slate-700">
                    <tr>
                      <th className="p-3 text-left font-medium text-gray-600 dark:text-slate-300">Label</th>
                      {datasets.map((d, i) => (
                        <th key={i} className="p-3 text-left font-medium text-gray-600 dark:text-slate-300">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={d.label || ''}
                              onChange={(e) => {
                                const newDatasets = [...datasets];
                                newDatasets[i].label = e.target.value;
                                setDatasets(newDatasets);
                              }}
                              className="border-b border-transparent hover:border-gray-300 dark:hover:border-slate-600 focus:border-blue-500 outline-none w-24 bg-transparent dark:text-white"
                            />
                            {datasets.length > 1 && (
                              <button onClick={() => handleDeleteDataset(i)} className="text-red-500 hover:text-red-700">
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </th>
                      ))}
                      <th className="p-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-slate-700">
                    {labels.map((label, labelIdx) => (
                      <tr key={labelIdx} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-3">
                          <input
                            type="text"
                            value={label || ''}
                            onChange={(e) => {
                              const newLabels = [...labels];
                              newLabels[labelIdx] = e.target.value;
                              setLabels(newLabels);
                            }}
                            className="w-full border-b border-transparent hover:border-gray-300 dark:hover:border-slate-600 focus:border-blue-500 outline-none bg-transparent dark:text-white"
                          />
                        </td>
                        {datasets.map((dataset, datasetIdx) => (
                          <td key={datasetIdx} className="p-3">
                            <input
                              type="number"
                              value={dataset.data[labelIdx] ?? ''}
                              onChange={(e) => {
                                const newDatasets = [...datasets];
                                newDatasets[datasetIdx].data[labelIdx] = Number(e.target.value);
                                setDatasets(newDatasets);
                              }}
                              className="w-full p-1 border dark:border-slate-700 rounded focus:ring-1 focus:ring-blue-500 outline-none dark:bg-slate-800 dark:text-white"
                            />
                          </td>
                        ))}
                        <td className="p-3">
                          {labels.length > 1 && (
                            <button onClick={() => handleDeleteLabel(labelIdx)} className="text-red-500 hover:text-red-700">
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6 border-t dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 flex flex-col-reverse sm:flex-row justify-between gap-3">
          {onDelete ? (
            <button
              onClick={() => {
                onDelete();
                onClose();
              }}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium"
            >
              Hapus Diagram
            </button>
          ) : (
            <div className="hidden sm:block"></div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 border dark:border-slate-700 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors font-medium dark:text-slate-300"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-lg shadow-blue-200 dark:shadow-blue-900/20"
            >
              Simpan Diagram
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
