import React from "react";
import { ArrowPathIcon, XMarkIcon, ExclamationTriangleIcon, SparklesIcon } from "../../../../Icons";
import type { ExamConfig } from "../../../../../types";

interface ExamConfigSettingsProps {
  config: ExamConfig;
  store: any;
  handleConfigChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  handleAddClassTag: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  hasManualGrading: boolean;
  isPremium?: boolean;
}

export const ExamConfigSettings: React.FC<ExamConfigSettingsProps> = ({
  config,
  store,
  handleConfigChange,
  handleAddClassTag,
  hasManualGrading,
  isPremium,
}) => {
  return (
    <div className="bg-white dark:bg-slate-800 p-8 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-sm space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
        <div className="md:col-span-2 pb-2 border-b border-gray-100 dark:border-slate-700 mb-2">
          <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Informasi Umum
          </h4>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
            Mata Pelajaran
          </label>
          <div
            onClick={() => store.setSubjectModalOpen(true)}
            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all text-sm font-medium flex items-center justify-between cursor-pointer hover:bg-white dark:hover:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600"
          >
            <span
              className={
                config.subject
                  ? "text-slate-800 dark:text-slate-200"
                  : "text-gray-400"
              }
            >
              {config.subject || "Pilih Mata Pelajaran..."}
            </span>
            <ArrowPathIcon className="w-4 h-4 text-gray-400 rotate-90" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
            Kelas
          </label>
          <div
            onClick={() => store.setClassModalOpen(true)}
            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all text-sm font-medium flex items-center justify-between cursor-pointer hover:bg-white dark:hover:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600"
          >
            <span
              className={
                config.classLevel && config.classLevel !== "Lainnya"
                  ? "text-slate-800 dark:text-slate-200"
                  : "text-gray-400"
              }
            >
              {config.classLevel === "Lainnya" || !config.classLevel
                ? "Pilih Kelas..."
                : config.classLevel}
            </span>
            <ArrowPathIcon className="w-4 h-4 text-gray-400 rotate-90" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
            Jenis Evaluasi
          </label>
          <div
            onClick={() => store.setExamTypeModalOpen(true)}
            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all text-sm font-medium flex items-center justify-between cursor-pointer hover:bg-white dark:hover:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600"
          >
            <span
              className={
                config.examType && config.examType !== "Lainnya"
                  ? "text-slate-800 dark:text-slate-200"
                  : "text-gray-400"
              }
            >
              {config.examType === "Lainnya" || !config.examType
                ? "Pilih Jenis..."
                : config.examType}
            </span>
            <ArrowPathIcon className="w-4 h-4 text-gray-400 rotate-90" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
            KKM (Opsional)
          </label>
          <input
            type="number"
            name="kkm"
            value={config.kkm || ""}
            onChange={handleConfigChange}
            className="w-full p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary text-sm font-medium shadow-sm text-slate-800 dark:text-slate-200"
            placeholder="Contoh: 75"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
            Target Kelas (Opsional)
          </label>
          <div className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl min-h-[56px] flex flex-wrap gap-2 items-center">
            {config.targetClasses?.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-lg border border-indigo-200 dark:border-indigo-800"
              >
                {tag}
                <button
                  onClick={() => store.removeClassTag(tag)}
                  className="p-0.5 hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-full transition-colors"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={store.classTagInput}
              onChange={(e) => store.setClassTagInput(e.target.value)}
              onKeyDown={handleAddClassTag}
              className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 min-w-[150px]"
              placeholder="Ketik kelas (contoh: 6A) atau kelas & jumlah (contoh: 6A 40)..."
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-2 italic font-medium">
            Biarkan kosong agar siswa bebas mengisi kelas. Ketik "6A" untuk
            membatasi kelas, atau "6A 40" untuk membatasi kelas dan jumlah
            siswa (otomatis menjadi "6A(40)").
          </p>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
            Instruksi Pengerjaan
          </label>
          <textarea
            name="description"
            value={config.description || ""}
            onChange={handleConfigChange}
            className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm min-h-[100px] shadow-inner text-slate-800 dark:text-slate-200"
            placeholder="Contoh: Baca doa sebelum mengerjakan, dilarang menoleh ke belakang..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8 pt-8 border-t border-gray-100 dark:border-slate-700">
        <div className="md:col-span-2 pb-2 border-b border-gray-100 dark:border-slate-700 mb-2">
          <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Waktu & Keamanan
          </h4>
        </div>

        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            onClick={() =>
              store.handleConfigChangeManual((prev: any) => ({
                ...prev,
                examMode: "UJIAN",
              }))
            }
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${config.examMode === "UJIAN" || !config.examMode ? "border-primary bg-primary/5" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary/30"}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${config.examMode === "UJIAN" || !config.examMode ? "border-primary" : "border-slate-400"}`}
              >
                {(config.examMode === "UJIAN" || !config.examMode) && (
                  <div className="w-2 h-2 bg-primary rounded-full" />
                )}
              </div>
              <span className="font-bold text-sm text-slate-800 dark:text-white">
                Mode Ujian
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed ml-6">
              Dikerjakan pada rentang tanggal dan waktu yang ketat.
            </p>
          </div>

          <div
            onClick={() =>
              store.handleConfigChangeManual((prev: any) => ({
                ...prev,
                examMode: "PR",
                detectBehavior: false,
                continueWithPermission: false,
                trackLocation: false,
              }))
            }
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${config.examMode === "PR" ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-amber-200"}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${config.examMode === "PR" ? "border-amber-500" : "border-slate-400"}`}
              >
                {config.examMode === "PR" && (
                  <div className="w-2 h-2 bg-amber-500 rounded-full" />
                )}
              </div>
              <span className="font-bold text-sm text-slate-800 dark:text-white">
                Mode PR / Latihan
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed ml-6">
              Dapat dikerjakan kapan saja sebelum tenggat waktu.
            </p>
          </div>
        </div>

        {(config.examMode === "UJIAN" || !config.examMode) && (
          <>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
                Tanggal Mulai
              </label>
              <input
                type="date"
                name="startDate"
                value={
                  config.startDate ||
                  config.date ||
                  new Date().toLocaleDateString("en-CA")
                }
                onChange={handleConfigChange}
                className="w-full p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary text-sm font-medium shadow-sm text-slate-800 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
                Jam Mulai
              </label>
              <input
                type="time"
                name="startTime"
                value={config.startTime}
                onChange={handleConfigChange}
                className="w-full p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary text-sm font-medium shadow-sm text-slate-800 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
                Jam Selesai
              </label>
              <input
                type="time"
                name="endTime"
                value={config.endTime || "10:00"}
                onChange={handleConfigChange}
                className="w-full p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary text-sm font-medium shadow-sm text-slate-800 dark:text-slate-200"
              />
            </div>
          </>
        )}
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
            Tenggat Waktu / Tanggal Selesai
          </label>
          <input
            type="date"
            name="endDate"
            value={
              config.endDate ||
              config.date ||
              new Date().toLocaleDateString("en-CA")
            }
            onChange={handleConfigChange}
            className="w-full p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary text-sm font-medium shadow-sm text-slate-800 dark:text-slate-200"
          />
        </div>
        {(config.examMode === "UJIAN" || !config.examMode) && (
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
              Durasi Pengerjaan (Menit)
            </label>
            <input
              type="number"
              name="timeLimit"
              value={config.timeLimit || ""}
              placeholder="0"
              onChange={handleConfigChange}
              className="w-full p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary text-sm font-medium shadow-sm text-slate-800 dark:text-slate-200"
            />
            <p className="text-xs text-slate-500 mt-1">
              Isi 0 untuk tanpa batas waktu.
            </p>
          </div>
        )}

        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
          <label className="flex items-center p-3 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer group shadow-sm">
            <input
              type="checkbox"
              name="shuffleQuestions"
              checked={config.shuffleQuestions}
              onChange={handleConfigChange}
              className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300"
            />
            <span className="ml-3 text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-primary transition-colors">
              Acak Soal
            </span>
          </label>
          <label className="flex items-center p-3 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer group shadow-sm">
            <input
              type="checkbox"
              name="shuffleAnswers"
              checked={config.shuffleAnswers}
              onChange={handleConfigChange}
              className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300"
            />
            <span className="ml-3 text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-primary transition-colors">
              Acak Opsi
            </span>
          </label>
          <label className="flex items-center p-3 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer group shadow-sm">
            <input
              type="checkbox"
              name="allowRetakes"
              checked={config.allowRetakes}
              onChange={handleConfigChange}
              className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300"
            />
            <span className="ml-3 text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-primary transition-colors">
              Izinkan Kerjakan Ulang
            </span>
          </label>
          {config.examMode !== "PR" && (
            <>
              <label className="flex items-center p-3 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer group shadow-sm">
                <input
                  type="checkbox"
                  name="detectBehavior"
                  checked={config.detectBehavior}
                  onChange={handleConfigChange}
                  className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300"
                />
                <span className="ml-3 text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-primary transition-colors">
                  Deteksi Kecurangan
                </span>
              </label>
              {config.detectBehavior && (
                <label className="flex items-center ml-6 p-2 rounded-lg transition-colors cursor-pointer group bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400">
                  <input
                    type="checkbox"
                    name="continueWithPermission"
                    checked={config.continueWithPermission}
                    onChange={handleConfigChange}
                    className="h-4 w-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                  />
                  <span className="ml-2 text-xs font-bold uppercase tracking-tight">
                    Kunci Akses Jika Melanggar
                  </span>
                </label>
              )}
            </>
          )}
        </div>

        <div className="md:col-span-2 space-y-4 pt-6 mt-2 border-t border-gray-100 dark:border-slate-700">
          <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Pengaturan Bank Soal
          </h4>
          <div className="p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <label className="flex items-center cursor-pointer group mb-2">
              <input
                type="checkbox"
                name="useBankSoal"
                checked={config.useBankSoal || false}
                onChange={handleConfigChange}
                className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300"
              />
              <span className="ml-3 text-sm font-bold text-gray-800 dark:text-slate-200 group-hover:text-primary transition-colors">
                Gunakan Sistem Bank Soal
              </span>
            </label>
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-4 pl-8 leading-relaxed">
              Fitur ini akan mengacak dan memilih soal secara otomatis dari
              total soal yang Anda buat, berdasarkan proporsi tingkat
              kesulitan.
              <div className="mt-2 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                <strong className="text-slate-700 dark:text-slate-300 block mb-1">
                  Panduan Level Soal:
                </strong>
                Sistem akan mengenali level soal yang Anda ketik di editor
                sebagai berikut:
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  <li>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      Mudah:
                    </span>{" "}
                    "mudah", "lots", "1", "easy", "rendah"
                  </li>
                  <li>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      Sedang:
                    </span>{" "}
                    "sedang", "mots", "2", "medium", "menengah"
                  </li>
                  <li>
                    <span className="font-semibold text-rose-600 dark:text-rose-400">
                      Sulit:
                    </span>{" "}
                    "sulit", "hots", "3", "hard", "tinggi"
                  </li>
                </ul>
              </div>
            </div>

            {config.useBankSoal && (
              <div className="space-y-4 pl-8 border-l-2 border-primary/20 ml-2 animate-fade-in">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                    Jumlah Soal yang Ditampilkan ke Siswa
                  </label>
                  <input
                    type="number"
                    name="bankSoalCount"
                    value={config.bankSoalCount || 10}
                    onChange={handleConfigChange}
                    className="w-full max-w-[200px] p-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary text-sm font-medium shadow-sm text-slate-800 dark:text-slate-200"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Pastikan sesuai dengan soal yang tersedia di editor.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-2">
                    Proporsi Tingkat Kesulitan (%)
                  </label>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 w-12">
                        Mudah
                      </span>
                      <input
                        type="number"
                        value={config.bankSoalProportions?.mudah ?? 30}
                        onChange={(e) =>
                          store.handleConfigChangeManual((prev: any) => ({
                            ...prev,
                            bankSoalProportions: {
                              ...prev.bankSoalProportions,
                              mudah: parseInt(e.target.value) || 0,
                            } as any,
                          }))
                        }
                        className="w-16 p-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded focus:ring-1 focus:ring-primary text-xs text-center"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-amber-600 dark:text-amber-400 w-12">
                        Sedang
                      </span>
                      <input
                        type="number"
                        value={config.bankSoalProportions?.sedang ?? 50}
                        onChange={(e) =>
                          store.handleConfigChangeManual((prev: any) => ({
                            ...prev,
                            bankSoalProportions: {
                              ...prev.bankSoalProportions,
                              sedang: parseInt(e.target.value) || 0,
                            } as any,
                          }))
                        }
                        className="w-16 p-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded focus:ring-1 focus:ring-primary text-xs text-center"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-rose-600 dark:text-rose-400 w-12">
                        Sulit
                      </span>
                      <input
                        type="number"
                        value={config.bankSoalProportions?.sulit ?? 20}
                        onChange={(e) =>
                          store.handleConfigChangeManual((prev: any) => ({
                            ...prev,
                            bankSoalProportions: {
                              ...prev.bankSoalProportions,
                              sulit: parseInt(e.target.value) || 0,
                            } as any,
                          }))
                        }
                        className="w-16 p-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded focus:ring-1 focus:ring-primary text-xs text-center"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2 italic">
                    Pastikan Anda telah mengisi "Level Soal" pada
                    masing-masing soal di editor sesuai dengan panduan level
                    di atas.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-2 space-y-4 pt-6 mt-2 border-t border-gray-100 dark:border-slate-700">
          <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Pengaturan Hasil & Monitor
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              className={`flex flex-col p-3 rounded-xl border transition-colors shadow-sm ${hasManualGrading ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 opacity-80" : "border-gray-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer group"}`}
            >
              <label
                className={`flex items-center ${hasManualGrading ? "cursor-not-allowed" : "cursor-pointer"}`}
              >
                <input
                  type="checkbox"
                  name="showResultToStudent"
                  checked={config.showResultToStudent}
                  onChange={handleConfigChange}
                  disabled={hasManualGrading}
                  className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300 disabled:text-gray-400"
                />
                <span
                  className={`ml-3 text-sm font-medium ${hasManualGrading ? "text-gray-500 dark:text-slate-500" : "text-gray-700 dark:text-slate-300 group-hover:text-primary dark:group-hover:text-primary"}`}
                >
                  Umumkan Nilai Otomatis
                </span>
              </label>
              {hasManualGrading && (
                <div className="mt-2 text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <ExclamationTriangleIcon className="w-3 h-3" />{" "}
                  Dinonaktifkan otomatis karena terdapat soal Esai atau
                  Isian Singkat.
                </div>
              )}
            </div>
            <label className="flex items-center p-3 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer group shadow-sm">
              <input
                type="checkbox"
                name="showCorrectAnswer"
                checked={config.showCorrectAnswer}
                onChange={handleConfigChange}
                className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300"
              />
              <span className="ml-3 text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-primary transition-colors">
                Tampilkan Kunci (Review)
              </span>
            </label>
            <label className="flex items-center p-3 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer group shadow-sm">
              <input
                type="checkbox"
                name="enableCertificate"
                checked={config.enableCertificate}
                onChange={handleConfigChange}
                className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300"
              />
              <span className="ml-3 text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-primary transition-colors">
                Berikan Akses Sertifikat
              </span>
            </label>
            {config.examMode !== "PR" && (
              <label className="flex items-center p-3 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer group shadow-sm">
                <input
                  type="checkbox"
                  name="trackLocation"
                  checked={config.trackLocation}
                  onChange={handleConfigChange}
                  className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300"
                />
                <span className="ml-3 text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-primary transition-colors">
                  Lacak Lokasi (GPS)
                </span>
              </label>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm relative overflow-hidden group gap-4">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-200/40 via-transparent to-transparent z-0 group-hover:from-amber-200/60 transition-colors"></div>
            <div className="flex items-start sm:items-center gap-3 z-10 flex-1 min-w-[200px]">
              <SparklesIcon className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <h5 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  Sertifikat Kelulusan Otomatis{" "}
                  {!isPremium && (
                    <span className="text-[9px] bg-gradient-to-r from-amber-200 to-amber-400 text-amber-900 px-2 py-0.5 rounded-full uppercase tracking-widest font-black shadow-sm flex items-center gap-1">
                      <SparklesIcon className="w-3 h-3" /> Premium
                    </span>
                  )}
                </h5>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 max-w-full sm:max-w-xs leading-relaxed mt-0.5">
                  Berikan e-Certificate otomatis untuk siswa. Bisa diunduh
                  secara massal di Dasbor Guru.
                </p>
              </div>
            </div>
            <button
              onClick={() =>
                isPremium && store.setCertificateModalOpen(true)
              }
              disabled={!isPremium}
              className={`z-10 px-4 py-2 text-xs font-bold whitespace-nowrap rounded-xl transition-all shadow-sm ${isPremium ? "text-amber-600 bg-amber-50 border border-amber-200 dark:border-amber-800/30 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/30 active:scale-95" : "text-gray-400 bg-gray-50 border border-gray-200 dark:border-slate-700 dark:bg-slate-800/50 cursor-not-allowed"}`}
            >
              {config.certificateSettings?.enabled
                ? "Ubah Desain"
                : "Buat Sertifikat"}
            </button>
          </div>

          <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
              Mode Operasi
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() =>
                  store.handleConfigChangeManual((prev: any) => ({
                    ...prev,
                    disableRealtime: true,
                    enablePublicStream: false,
                  }))
                }
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${config.disableRealtime ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-200"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${config.disableRealtime ? "border-emerald-500" : "border-slate-400"}`}
                  >
                    {config.disableRealtime && (
                      <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-800 dark:text-white">
                      Mode Stabil
                    </span>
                    <span className="text-[9px] font-black bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full uppercase tracking-widest">
                      Rekomendasi
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed ml-6">
                  Menyimpan data hanya saat selesai atau tab ditutup. Aman untuk koneksi lambat.
                </p>
              </div>

              <div
                onClick={() =>
                  store.handleConfigChangeManual((prev: any) => ({
                    ...prev,
                    disableRealtime: false,
                    enablePublicStream: false,
                  }))
                }
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${!config.disableRealtime && !config.enablePublicStream ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-200"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${!config.disableRealtime && !config.enablePublicStream ? "border-indigo-500" : "border-slate-400"}`}
                  >
                    {!config.disableRealtime && !config.enablePublicStream && (
                      <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                    )}
                  </div>
                  <span className="font-bold text-sm text-slate-800 dark:text-white">
                    Mode Realtime
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed ml-6">
                  Menyimpan jawaban siswa setiap detik. Membutuhkan koneksi internet yang kuat dan stabil.
                </p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
               <label className="flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    name="enablePublicStream"
                    checked={config.enablePublicStream || false}
                    onChange={(e) => {
                       store.handleConfigChangeManual((prev: any) => ({
                         ...prev,
                         enablePublicStream: e.target.checked,
                         disableRealtime: false
                       }))
                    }}
                    className="h-5 w-5 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <div className="ml-3 flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-800 dark:text-slate-200 group-hover:text-indigo-600 transition-colors">
                      Izinkan Penonton Publik
                    </span>
                    {!isPremium && (
                      <span className="text-[9px] bg-gradient-to-r from-amber-200 to-amber-400 text-amber-900 px-2 py-0.5 rounded-full uppercase tracking-widest font-black shadow-sm flex items-center gap-1">
                        <SparklesIcon className="w-3 h-3" /> Premium
                      </span>
                    )}
                  </div>
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 pl-8">
                  Menyediakan link streaming public sehingga penonton atau orang tua dapat melihat kemajuan siswa secara live selama ujian berlangsung. Ini memaksa mode Realtime aktif.
                </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
