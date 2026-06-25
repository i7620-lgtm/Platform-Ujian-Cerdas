import React, { lazy, Suspense } from "react";
import type { Question, QuestionType } from "../../types";
import {
  TrashIcon,
  XMarkIcon,
  PlusCircleIcon,
  FileTextIcon,
  ListBulletIcon,
  CheckCircleIcon,
  PencilIcon,
  FileWordIcon,
  CheckIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  SignalIcon,
  WifiIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
} from "../Icons";
import { parseList, isAnswerMatch } from "./examUtils";
import { EXAM_TYPES } from "./constants";
import { useExamEditor } from "./useExamEditor";
import { QuestionCard } from "./QuestionCard";
import { ExamConfigSettings } from "./features/exam-editor/components/ExamConfigSettings";

import { WysiwygEditor, SelectionModal } from "./WysiwygEditor";

const ChartConfigModal = lazy(() => import("./ChartConfigModal").then(module => ({ default: module.ChartConfigModal })));
const CertificateEditorModal = lazy(() => import("./CertificateEditorModal").then(module => ({ default: module.CertificateEditorModal })));

interface ExamEditorProps {
  isEditing: boolean;
  onSave: () => void;
  onSaveDraft?: () => void;
  onCancel: () => void;
  generatedCode: string;
  onReset: () => void;
  isPremium?: boolean;
}

const SUBJECTS = [
  "Agama Buddha",
  "Agama Hindu",
  "Agama Islam",
  "Agama Katolik",
  "Agama Khonghucu",
  "Agama Kristen",
  "Antropologi",
  "Bahasa Bali",
  "Bahasa Indonesia",
  "Bahasa Indonesia Lanjut",
  "Bahasa Inggris",
  "Bahasa Inggris Lanjut",
  "Bimbingan Konseling (BK)",
  "Biologi",
  "Biologi Lanjut",
  "Ekonomi",
  "Fisika",
  "Fisika Lanjut",
  "Geografi",
  "Ilmu Pengetahuan Alam (IPA)",
  "Ilmu Pengetahuan Alam dan Sosial (IPAS)",
  "Ilmu Pengetahuan Sosial (IPS)",
  "Informatika",
  "Kepercayaan",
  "Kimia",
  "Kimia Lanjut",
  "Koding dan Kecerdasan Artifisial (KKA)",
  "Lainnya",
  "Matematika",
  "Matematika Lanjut",
  "Muatan Lokal",
  "Pendidikan Jasmani, Olahraga dan Kesehatan (PJOK)",
  "Pendidikan Pancasila",
  "Prakarya",
  "Sejarah",
  "Seni Budaya",
  "Sosiologi",
  "Teknologi Informasi dan Komunikasi (TIK)",
];

const CLASSES = [
  "Kelas 1",
  "Kelas 2",
  "Kelas 3",
  "Kelas 4",
  "Kelas 5",
  "Kelas 6",
  "Kelas 7",
  "Kelas 8",
  "Kelas 9",
  "Kelas 10",
  "Kelas 11",
  "Kelas 12",
  "Mahasiswa",
  "Umum",
];

export const ExamEditor: React.FC<ExamEditorProps> = ({
  isEditing,
  onSave,
  onSaveDraft,
  onCancel,
  generatedCode,
  onReset,
  isPremium,
}) => {
  const hookResult = useExamEditor({ isEditing, generatedCode, isPremium });
  const {
    questions,
    config,
    questionsSectionRef,
    generatedCodeSectionRef,
    handleAddClassTag,
    hasManualGrading,
    handleGenerateSingleQuestion,
    handleConfigChange,
  } = hookResult;

  const store = hookResult;

  const renderTypeSelectionModal = () => {
    if (!store.isTypeSelectionModalOpen) return null;

    const types: {
      type: QuestionType;
      label: string;
      desc: string;
      icon: React.FC<{ className?: string }>;
    }[] = [
      {
        type: "INFO",
        label: "Keterangan / Info",
        desc: "Hanya teks atau gambar, tanpa pertanyaan.",
        icon: FileTextIcon,
      },
      {
        type: "MULTIPLE_CHOICE",
        label: "Pilihan Ganda",
        desc: "Satu jawaban benar dari beberapa opsi.",
        icon: ListBulletIcon,
      },
      {
        type: "COMPLEX_MULTIPLE_CHOICE",
        label: "Pilihan Ganda Kompleks",
        desc: "Lebih dari satu jawaban benar.",
        icon: CheckCircleIcon,
      },
      {
        type: "FILL_IN_THE_BLANK",
        label: "Isian Singkat",
        desc: "Jawaban teks pendek otomatis dinilai.",
        icon: PencilIcon,
      },
      {
        type: "ESSAY",
        label: "Uraian / Esai",
        desc: "Jawaban panjang dinilai manual.",
        icon: FileWordIcon,
      },
      {
        type: "TRUE_FALSE",
        label: "Benar / Salah",
        desc: "Memilih pernyataan benar atau salah.",
        icon: CheckIcon,
      },
      {
        type: "MATCHING",
        label: "Menjodohkan",
        desc: "Menghubungkan pasangan item kiri dan kanan.",
        icon: ArrowLeftIcon,
      },
    ];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[60] animate-fade-in">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-white dark:border-slate-700">
          <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900">
            <h3 className="font-bold text-lg text-gray-800 dark:text-white">
              Pilih Tipe Soal
            </h3>
            <button
              onClick={() => store.setTypeSelectionModalOpen(false)}
              className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700"
            >
              <XMarkIcon className="w-5 h-5 text-gray-500 dark:text-slate-400" />
            </button>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {types.map((t) => (
              <button
                key={t.type}
                onClick={() => store.handleSelectQuestionType(t.type)}
                className="flex items-start gap-4 p-4 border dark:border-slate-700 rounded-lg hover:border-primary dark:hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 hover:shadow-md transition-all text-left group bg-white dark:bg-slate-800"
              >
                <div className="bg-gray-100 dark:bg-slate-700 p-2.5 rounded-full group-hover:bg-primary group-hover:text-white transition-colors text-gray-500 dark:text-slate-300">
                  <t.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-gray-800 dark:text-slate-200 group-hover:text-primary dark:group-hover:text-primary">
                    {t.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    {t.desc}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-10 border-t-2 border-gray-200 dark:border-slate-700 pt-12">
      <div
        ref={questionsSectionRef}
        id="exam-editor-section"
        className="space-y-4 scroll-mt-32"
      >
        <div className="p-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm">
          <h2 className="text-xl font-bold text-neutral dark:text-white">
            {isEditing ? "1. Editor Soal" : "3. Editor Soal"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Gunakan editor teks kaya di bawah untuk membuat konten soal
            berkualitas.
          </p>
        </div>
        <div className="space-y-6">
          {questions.length > 0 && (
            <div className="relative py-2 group/insert">
              <div
                className="absolute inset-0 flex items-center"
                aria-hidden="true"
              >
                <div className="w-full border-t border-gray-200 dark:border-slate-700 group-hover/insert:border-primary/30 transition-colors"></div>
              </div>
              <div className="relative flex justify-center">
                <button
                  onClick={() => {
                    store.setInsertIndex(-1);
                    store.setTypeSelectionModalOpen(true);
                  }}
                  className="bg-white dark:bg-slate-900 text-gray-400 dark:text-slate-500 group-hover/insert:text-primary group-hover/insert:bg-primary/5 px-4 py-1 text-xs font-semibold rounded-full border border-gray-200 dark:border-slate-700 group-hover/insert:border-primary/30 shadow-sm transition-all transform hover:scale-105 flex items-center gap-1 opacity-0 group-hover/insert:opacity-100 focus:opacity-100"
                >
                  <PlusCircleIcon className="w-4 h-4" /> Sisipkan Soal Di Awal
                </button>
              </div>
            </div>
          )}
          {questions.map((q, index) => {
            const questionNumber =
              questions.slice(0, index).filter((i) => i.questionType !== "INFO")
                .length + 1;
            return (
              <QuestionCard
                key={q.id}
                q={q}
                index={index}
                questionNumber={questionNumber}
                isGenerating={store.isGeneratingId === q.id}
                onGenerate={handleGenerateSingleQuestion}
              />
            );
          })}
        </div>
        <div className="mt-12 mb-20 text-center">
          <button
            onClick={() => {
              store.setInsertIndex(null);
              store.setTypeSelectionModalOpen(true);
            }}
            className="flex items-center gap-2 text-sm text-primary dark:text-indigo-400 font-bold hover:text-primary-focus mx-auto transition-all bg-white dark:bg-slate-800 border border-primary/20 dark:border-indigo-500/30 px-8 py-4 rounded-2xl hover:bg-primary dark:hover:bg-indigo-600 hover:text-white shadow-sm hover:shadow-lg active:scale-95 group"
          >
            <PlusCircleIcon className="w-5 h-5 group-hover:text-white transition-colors" />{" "}
            Tambah Soal Baru
          </button>
        </div>
      </div>

      <div className="pt-10">
        <div className="p-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm mb-6">
          <h2 className="text-xl font-bold text-neutral dark:text-white">
            {isEditing ? "2. Konfigurasi" : "4. Konfigurasi"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Pengaturan waktu dan keamanan ujian.
          </p>
        </div>

        <ExamConfigSettings
          config={config}
          store={store}
          handleConfigChange={handleConfigChange}
          handleAddClassTag={handleAddClassTag}
          hasManualGrading={hasManualGrading}
          isPremium={isPremium}
        />
      </div>

      <div className="text-center pt-10 pb-20">
        {isEditing ? (
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 w-full sm:w-auto px-4 sm:px-0">
            <button
              onClick={onCancel}
              className="w-full sm:w-auto bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-300 dark:border-slate-600 font-bold py-4 px-10 rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all shadow-sm active:scale-95"
            >
              Batal
            </button>
            {onSaveDraft && (
              <button
                onClick={onSaveDraft}
                className="w-full sm:w-auto bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 font-bold py-4 px-10 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95"
              >
                <PencilIcon className="w-5 h-5" /> Perbarui Draf
              </button>
            )}
            <button
              onClick={onSave}
              className="w-full sm:w-auto bg-primary dark:bg-indigo-600 text-white font-bold py-4 px-14 rounded-2xl hover:bg-primary-focus dark:hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 dark:shadow-indigo-900/30 transform hover:-translate-y-1 active:scale-95"
            >
              Simpan Perubahan
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row justify-center gap-4 items-center">
              {onSaveDraft && (
                <button
                  onClick={onSaveDraft}
                  className="w-full sm:w-auto bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-2 border-slate-100 dark:border-slate-700 font-bold py-4 px-10 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <PencilIcon className="w-5 h-5" /> Simpan Draf
                </button>
              )}
              <button
                onClick={onSave}
                className="w-full sm:w-auto bg-emerald-600 text-white font-bold py-4 px-14 rounded-2xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 dark:shadow-emerald-900/30 transform hover:-translate-y-1 flex items-center justify-center gap-3 active:scale-95"
              >
                <CheckCircleIcon className="w-6 h-6" /> Publikasikan Sekarang
              </button>
            </div>
            {generatedCode && (
              <div
                ref={generatedCodeSectionRef}
                className="mt-12 p-1 rounded-3xl animate-fade-in text-center max-w-md mx-auto bg-gradient-to-tr from-emerald-400 to-teal-500 shadow-2xl"
              >
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[1.4rem] text-center">
                  <h4 className="font-black text-2xl text-slate-800 dark:text-white mb-2">
                    Ujian Aktif!
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium leading-relaxed">
                    Berikan kode unik ini kepada siswa Anda agar mereka dapat
                    mulai mengerjakan.
                  </p>
                  <div className="flex flex-col gap-4">
                    <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl border-2 border-emerald-50 dark:border-emerald-900/30 shadow-inner group transition-all hover:bg-emerald-50/30 dark:hover:bg-emerald-900/20">
                      <span className="text-4xl font-black tracking-[0.3em] text-emerald-600 dark:text-emerald-400 font-mono block">
                        {generatedCode}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedCode);
                        alert("Kode berhasil disalin!");
                      }}
                      className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors py-2"
                    >
                      Salin Kode Akses
                    </button>
                  </div>
                  <button
                    onClick={onReset}
                    className="mt-8 w-full bg-slate-900 dark:bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-black dark:hover:bg-indigo-700 transition-all shadow-lg active:scale-95"
                  >
                    Selesai & Tutup
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {renderTypeSelectionModal()}
      <SelectionModal
        key={store.isSubjectModalOpen ? "subject-open" : "subject-closed"}
        isOpen={store.isSubjectModalOpen}
        title="Pilih Mata Pelajaran"
        options={SUBJECTS}
        selectedValue={config.subject || ""}
        onClose={() => store.setSubjectModalOpen(false)}
        onSelect={(val) => store.handleSubjectSelect(val)}
        searchPlaceholder="Cari mata pelajaran..."
      />
      <SelectionModal
        key={store.isClassModalOpen ? "class-open" : "class-closed"}
        isOpen={store.isClassModalOpen}
        title="Pilih Kelas"
        options={CLASSES}
        selectedValue={config.classLevel || ""}
        onClose={() => store.setClassModalOpen(false)}
        onSelect={(val) =>
          store.handleConfigChangeManual((prev) => ({
            ...prev,
            classLevel: val,
          }))
        }
        searchPlaceholder="Cari kelas..."
      />
      <SelectionModal
        key={store.isExamTypeModalOpen ? "exam-type-open" : "exam-type-closed"}
        isOpen={store.isExamTypeModalOpen}
        title="Pilih Jenis Evaluasi"
        options={EXAM_TYPES}
        selectedValue={config.examType || ""}
        onClose={() => store.setExamTypeModalOpen(false)}
        onSelect={(val) =>
          store.handleConfigChangeManual((prev) => ({ ...prev, examType: val }))
        }
        searchPlaceholder="Cari jenis evaluasi..."
      />

      {store.editingChartTarget && (
        <Suspense fallback={<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"><div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl flex items-center gap-4"><div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-primary animate-spin"></div><div className="text-slate-600 dark:text-slate-300 font-medium">Memuat Editor Grafik...</div></div></div>}>
          <ChartConfigModal
            isOpen={!!store.editingChartTarget}
            onClose={() => store.setEditingChartTarget(null)}
            onSave={(data) => store.handleSaveChart(data)}
            onDelete={() => store.handleDeleteChart()}
            initialData={(() => {
              if (!store.editingChartTarget) return undefined;
              const { qId, type, index, subIndex } = store.editingChartTarget;
              const q = questions.find((item) => item.id === qId);
              if (!q) return undefined;
              if (type === "question") return q.chartData;
              if (type === "option" && index !== undefined)
                return q.optionCharts?.[index] || undefined;
              if (type === "tf" && index !== undefined)
                return q.trueFalseRows?.[index].chartData;
              if (type === "matching" && index !== undefined) {
                return subIndex === "left"
                  ? q.matchingPairs?.[index].leftChart
                  : q.matchingPairs?.[index].rightChart;
              }
              if (type === "correctAnswer") return q.correctAnswerChart;
              return undefined;
            })()}
          />
        </Suspense>
      )}

      {store.isCertificateModalOpen && (
        <Suspense fallback={<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"><div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl flex items-center gap-4"><div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-primary animate-spin"></div><div className="text-slate-600 dark:text-slate-300 font-medium">Memuat Editor Sertifikat...</div></div></div>}>
          <CertificateEditorModal
            isOpen={store.isCertificateModalOpen}
            onClose={() => store.setCertificateModalOpen(false)}
            settings={config.certificateSettings as any}
            onSave={(newSettings) =>
              store.handleConfigChangeManual((prev) => ({
                ...prev,
                certificateSettings: newSettings,
              }))
            }
            subjectPlaceholder={config.subject || "Mata Pelajaran"}
            examTypePlaceholder={config.examType || "Ujian"}
            classLevelPlaceholder={config.classLevel || "10"}
            datePlaceholder={config.startDate || config.date || undefined}
          />
        </Suspense>
      )}
    </div>
  );
};
