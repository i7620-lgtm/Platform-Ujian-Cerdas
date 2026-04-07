
import React, { useState, useEffect } from 'react';
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
  const [type, setType] = useState<'bar' | 'line' | 'pie'>('bar');
  const [title, setTitle] = useState('');
  const [labels, setLabels] = useState<string[]>(['Jan', 'Feb', 'Mar']);
  const [datasets, setDatasets] = useState<{ label: string; data: number[] }[]>([
    { label: 'Data 1', data: [10, 20, 30] }
  ]);
  const [showTooltip, setShowTooltip] = useState<boolean>(true);

  useEffect(() => {
    if (initialData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setType(initialData.type);
      setTitle(initialData.title || '');
      setLabels(initialData.labels);
      setDatasets(initialData.datasets.map(d => ({ label: d.label, data: d.data })));
      setShowTooltip(initialData.showTooltip !== false);
    }
  }, [initialData, isOpen]);

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
      showTooltip
    });
    onClose();
  };

  return (
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
                onChange={(e) => setType(e.target.value as 'bar' | 'line' | 'pie')}
                className="w-full p-2 border dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-800 dark:text-white"
              >
                <option value="bar">Diagram Batang (Bar)</option>
                <option value="line">Diagram Garis (Line)</option>
                <option value="pie">Diagram Lingkaran (Pie)</option>
              </select>
            </div>
          </div>

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
                            value={d.label}
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
                          value={label}
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
                            value={dataset.data[labelIdx]}
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
        </div>

        <div className="p-6 border-t dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 flex justify-between gap-3">
          {onDelete ? (
            <button
              onClick={() => {
                onDelete();
                onClose();
              }}
              className="px-6 py-2 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium"
            >
              Hapus Diagram
            </button>
          ) : (
            <div></div>
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border dark:border-slate-700 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors font-medium dark:text-slate-300"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-lg shadow-blue-200 dark:shadow-blue-900/20"
            >
              Simpan Diagram
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
