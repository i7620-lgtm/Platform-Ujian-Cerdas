import React, { useState } from "react";
import { StarIcon, CheckCircleIcon, XMarkIcon } from "../../Icons";
import { supabase } from "../../../lib/supabase";

interface StudentFeedbackModalProps {
  examCode: string;
  studentName: string;
  studentId: string;
  schoolName?: string;
  onClose: () => void;
}

const RATING_DESCRIPTIONS: Record<number, { text: string; emoji: string; color: string }> = {
  1: { text: "Perlu Banyak Perbaikan", emoji: "😞", color: "text-rose-500" },
  2: { text: "Kurang Memuaskan", emoji: "😐", color: "text-amber-500" },
  3: { text: "Cukup Bagus", emoji: "🙂", color: "text-yellow-500" },
  4: { text: "Bagus & Lancar", emoji: "😊", color: "text-blue-500" },
  5: { text: "Sangat Memuaskan!", emoji: "🤩", color: "text-emerald-500" },
};

const SUGGESTED_TAGS = [
  "⚡ Aplikasi Cepat & Ringan",
  "✨ Tampilan Jelas & Rapi",
  "📱 Mudah Digunakan",
  "⏱️ Timer & Soal Akurat",
  "🔒 Pengawasan Tertib",
];

export const StudentFeedbackModal: React.FC<StudentFeedbackModalProps> = ({
  examCode,
  studentName,
  studentId,
  schoolName,
  onClose,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const activeRating = hoverRating || rating;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;

    setIsSubmitting(true);

    const feedbackPayload = {
      examCode,
      studentId,
      studentName,
      schoolName: schoolName || "-",
      rating,
      comment: feedback.trim(),
      tags: selectedTags,
      createdAt: new Date().toISOString(),
    };

    // 1. Simpan di LocalStorage agar tidak muncul berulang
    try {
      localStorage.setItem(
        `feedback_submitted_${examCode}_${studentId}`,
        JSON.stringify(feedbackPayload)
      );

      // Simpan riwayat feedback lokal
      const existingFeedbacks = JSON.parse(
        localStorage.getItem("app_user_feedbacks") || "[]"
      );
      existingFeedbacks.push(feedbackPayload);
      localStorage.setItem(
        "app_user_feedbacks",
        JSON.stringify(existingFeedbacks.slice(-50))
      );
    } catch {
      /* ignore storage quota */
    }

    // 2. Kirim ke Supabase jika tabel tersedia (non-blocking)
    try {
      await (supabase.from("app_feedbacks") as any).insert([
        {
          exam_code: examCode,
          student_id: studentId,
          student_name: studentName,
          school_name: schoolName,
          rating,
          feedback: feedback.trim(),
          tags: selectedTags,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch {
      /* ignore if table does not exist */
    }

    setIsSubmitting(false);
    setIsSubmitted(true);

    // Auto-close after 1.6s
    setTimeout(() => {
      onClose();
    }, 1600);
  };

  return (
    <div
      id="modal-feedback-overlay"
      className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
    >
      <div
        id="modal-feedback-card"
        className="bg-white dark:bg-slate-900 w-full max-w-sm sm:max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-gentle-slide text-center relative"
      >
        {/* Tombol Tutup / Skip */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Tutup"
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8">
          {isSubmitted ? (
            <div className="py-6 flex flex-col items-center space-y-3 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 flex items-center justify-center shadow-inner">
                <CheckCircleIcon className="w-10 h-10 animate-bounce" />
              </div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">
                Terima Kasih Banyak!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[260px]">
                Penilaian dan saran Anda sangat membantu kami dalam mengembangkan aplikasi ini.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Header Icon & Title */}
              <div className="space-y-1">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-500 mb-2 shadow-sm">
                  <StarIcon className="w-6 h-6 fill-amber-400 text-amber-400" />
                </div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">
                  Bagaimana Pengalaman Anda?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Berikan penilaian & kritik/saran untuk aplikasi ini
                </p>
              </div>

              {/* Star Rating Controls */}
              <div className="py-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800/80 px-4">
                <div className="flex items-center justify-center gap-2 sm:gap-3 py-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      className="p-1 sm:p-1.5 focus:outline-none transition-transform hover:scale-125 active:scale-95"
                      aria-label={`Beri rating ${star} bintang`}
                    >
                      <StarIcon
                        className={`w-8 h-8 transition-colors ${
                          star <= activeRating
                            ? "fill-amber-400 text-amber-400 drop-shadow-sm"
                            : "fill-transparent text-slate-300 dark:text-slate-600"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <p
                  className={`text-xs font-bold transition-all mt-1 ${
                    RATING_DESCRIPTIONS[activeRating]?.color || "text-slate-500"
                  }`}
                >
                  {RATING_DESCRIPTIONS[activeRating]?.emoji}{" "}
                  {RATING_DESCRIPTIONS[activeRating]?.text}
                </p>
              </div>

              {/* Quick Tags Selection */}
              <div className="text-left space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  Kesan & Fitur (Opsional):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_TAGS.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                          isSelected
                            ? "bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700"
                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Textarea for Feedback */}
              <div className="text-left space-y-1">
                <label
                  htmlFor="feedback-comment"
                  className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block"
                >
                  Kritik & Saran:
                </label>
                <textarea
                  id="feedback-comment"
                  rows={3}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Tulis masukan, kendala, atau saran perbaikan di sini..."
                  className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none transition-colors"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors uppercase tracking-wider min-h-[44px]"
                >
                  Nanti Saja
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[1.5] py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-xl shadow-lg shadow-indigo-500/20 transition-all uppercase tracking-wider flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Mengirim...</span>
                  ) : (
                    <>
                      <span>Kirim Penilaian</span>
                      <CheckCircleIcon className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
