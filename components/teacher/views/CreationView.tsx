import React, { useState, useEffect, useRef } from 'react';
import type { Question, QuizConfig } from '../../../types';
import { parsePdfAndAutoCrop, convertPdfToImages } from '../examUtils';
import { generateQuestions } from '../../services/gemini';
import { PencilIcon, CloudArrowUpIcon, SparklesIcon, CogIcon } from '../../Icons';

interface CreationViewProps { 
    onQuestionsGenerated: (questions: Question[], mode: 'manual' | 'auto') => void; 
    isPremium?: boolean;
}
type InputMethod = 'ai' | 'upload';

export const CreationView: React.FC<CreationViewProps> = ({ onQuestionsGenerated, isPremium }) => {
    const [inputMethod, setInputMethod] = useState<InputMethod>('upload');
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [previewImages, setPreviewImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const aiSectionRef = useRef<HTMLDivElement>(null);
    
    const [aiConfig, setAiConfig] = useState<QuizConfig>({
        count: 5,
        type: 'Pilihan Ganda',
        subject: '',
        difficulty: 'C3 - Mengaplikasikan',
        blueprint: '',
        includeImages: false
    });

    useEffect(() => {
        const loadPreview = async () => {
            if (uploadedFile && uploadedFile.type === 'application/pdf') {
                try { const images = await convertPdfToImages(uploadedFile, 1.5); setPreviewImages(images); } catch (e) { console.error("Gagal memuat pratinjau PDF:", e); setPreviewImages([]); }
            } else { setPreviewImages([]); }
        };
        loadPreview();
    }, [uploadedFile]);

    const handleStartAnalysis = async () => { 
        setIsLoading(true); 
        setError(''); 
        try { 
            if (inputMethod === 'ai') { 
                if (!aiConfig.subject.trim()) throw new Error("Silakan isi mata pelajaran/materi terlebih dahulu."); 
                const generatedQuestions = await generateQuestions(aiConfig);
                if (generatedQuestions.length === 0) throw new Error("Gagal menghasilkan soal dari AI.");
                onQuestionsGenerated(generatedQuestions, 'auto'); 
            } else if (inputMethod === 'upload' && uploadedFile) { 
                if (uploadedFile.type !== 'application/pdf') throw new Error("Fitur ini hanya mendukung file PDF."); 
                const parsedQuestions = await parsePdfAndAutoCrop(uploadedFile); 
                if (parsedQuestions.length === 0) throw new Error("Tidak dapat menemukan soal yang valid dari PDF. Pastikan format soal jelas."); 
                onQuestionsGenerated(parsedQuestions, 'manual'); 
            } else { 
                throw new Error("Silakan pilih file untuk diunggah."); 
            } 
        } catch (err) { 
            const errorMessage = err instanceof Error ? err.message : 'Gagal memproses permintaan.';
            if (errorMessage === 'QUOTA_EXCEEDED_MINUTE') {
                setError('⚠️ Peringatan Tipe 1: Batas 15 penggunaan (request) per menit telah tercapai pada akun gratis Gemini Flash (atau 10 API request/menit untuk model terpisah). Silakan tunggu 1 menit lalu coba lagi.');
            } else if (errorMessage === 'QUOTA_EXCEEDED_DAY') {
                setError('⛔ Peringatan Tipe 2: Batas penggunaan harian gratis (1500 request/hari) dari Gemini Flash telah habis. Silakan coba kembali besok hari atau gunakan model dengan akun berbayar (Jika dikonfigurasi).');
            } else if (errorMessage === 'QUOTA_EXCEEDED_TOKENS') {
                setError('⚠️ Peringatan Tipe 3: Teks/Konteks materi yang dimasukkan terlalu panjang dan melebihi batas (Maksimum 1 juta token/menit). Kurangi panjang kisi-kisi atau tunggu 1 menit sebelum mencoba lagi.');
            } else if (errorMessage === 'QUOTA_EXCEEDED_GENERAL' || errorMessage === 'QUOTA_EXCEEDED') {
                setError('⛔ Peringatan: Batas kuota gratis pemakaian AI / Gemini API telah tercapai (15 req/menit atau 1500 req/hari). Silakan tunggu beberapa saat atau coba lagi besok hari.');
            } else {
                setError(errorMessage); 
            }
        } finally { 
            setIsLoading(false); 
        } 
    };
    const handleManualCreateClick = () => { setUploadedFile(null); setError(''); onQuestionsGenerated([], 'manual'); };

    const handleAiClick = () => {
        setInputMethod('ai');
        setTimeout(() => {
            aiSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    return (
        <div className="w-full max-w-full mx-auto animate-fade-in space-y-12">
            <div className="space-y-8"><div className="text-center space-y-4"><h2 className="text-3xl font-bold text-neutral dark:text-white">Buat Ujian Baru</h2><p className="text-gray-500 dark:text-slate-400 max-w-2xl mx-auto">Mulai dengan mengunggah soal dalam format PDF, membuat soal dengan bantuan AI, atau membuat soal secara manual. Sistem kami akan membantu Anda menyusun ujian dengan mudah.</p></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6"><div className={`p-6 border-2 rounded-2xl cursor-pointer transition-all duration-300 group border-gray-100 dark:border-slate-700 hover:border-primary/50 dark:hover:border-primary/50 hover:shadow-lg bg-white dark:bg-slate-800`} onClick={handleManualCreateClick}><div className="flex flex-col items-center text-center space-y-3"><div className={`p-4 rounded-2xl transition-colors bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-slate-300 group-hover:bg-primary/10 group-hover:text-primary`}><PencilIcon className="w-8 h-8" /></div><h3 className="font-bold text-lg text-neutral dark:text-white">Buat Manual</h3><p className="text-sm text-gray-500 dark:text-slate-400">Buat soal dari awal secara manual tanpa impor file atau teks.</p></div></div><div className={`p-6 border-2 rounded-2xl cursor-pointer transition-all duration-300 group ${inputMethod === 'upload' ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-md' : 'border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary/50 hover:shadow-lg'}`} onClick={() => setInputMethod('upload')}><div className="flex flex-col items-center text-center space-y-3"><div className={`p-4 rounded-2xl transition-colors ${inputMethod === 'upload' ? 'bg-primary text-white' : 'bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-slate-300 group-hover:bg-primary/10 group-hover:text-primary'}`}><CloudArrowUpIcon className="w-8 h-8" /></div><h3 className="font-bold text-lg text-neutral dark:text-white">Unggah PDF Soal</h3><p className="text-sm text-gray-500 dark:text-slate-400">Sistem akan otomatis mendeteksi dan memotong soal dari file PDF Anda.</p></div></div><div className={`p-6 border-2 rounded-2xl transition-all duration-300 group relative ${inputMethod === 'ai' ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-md cursor-pointer' : 'border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary/50 hover:shadow-lg cursor-pointer'}`} onClick={() => handleAiClick()}><div className="flex flex-col items-center text-center space-y-3"><div className={`p-4 rounded-2xl transition-colors ${inputMethod === 'ai' ? 'bg-primary text-white' : 'bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-slate-300 group-hover:bg-primary/10 group-hover:text-primary'}`}><SparklesIcon className="w-8 h-8" /></div><div className="flex flex-col items-center gap-1.5"><h3 className="font-bold text-lg text-neutral dark:text-white">Buat dengan AI</h3></div><p className="text-sm text-gray-500 dark:text-slate-400">Hasilkan soal secara otomatis menggunakan bantuan AI dari materi Anda.</p></div></div></div>
                <div ref={aiSectionRef} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm transition-all duration-300"><div className="mb-4"><h3 className="text-lg font-bold text-neutral dark:text-white mb-1">{inputMethod === 'upload' ? 'Unggah File PDF' : 'Pembuatan Soal Berbantuan AI'}</h3><p className="text-sm text-gray-500 dark:text-slate-400">{inputMethod === 'upload' ? 'Pilih file PDF dari perangkat Anda.' : 'Isi konfigurasi di bawah ini untuk menghasilkan soal.'}</p></div>
                    {inputMethod === 'upload' ? (
                        <div className="space-y-4">
                            <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-8 text-center hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors relative">
                                <input 
                                    type="file" 
                                    accept=".pdf" 
                                    onChange={(e) => { 
                                        if (e.target.files && e.target.files[0]) { 
                                            const file = e.target.files[0];
                                            if (file.size > 10 * 1024 * 1024) { // 10MB Check
                                                setError("Ukuran file terlalu besar (Max 10MB). Harap kompres PDF Anda.");
                                                e.target.value = '';
                                                setUploadedFile(null);
                                                return;
                                            }
                                            setError('');
                                            setUploadedFile(file); 
                                        } 
                                    }} 
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                                />
                                <div className="space-y-2 pointer-events-none">
                                    <CloudArrowUpIcon className="w-10 h-10 text-gray-400 dark:text-slate-500 mx-auto" />
                                    {uploadedFile ? (<p className="font-semibold text-primary">{uploadedFile.name}</p>) : (<><p className="text-gray-600 dark:text-slate-300 font-medium">Klik atau seret file PDF ke sini</p><p className="text-xs text-gray-400 dark:text-slate-500">Maksimal ukuran file 10MB</p></>)}
                                </div>
                            </div>
                            {previewImages.length > 0 && (<div className="space-y-2"><p className="text-sm font-semibold text-gray-700 dark:text-slate-300">Pratinjau Halaman Pertama:</p><div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto bg-gray-50 dark:bg-slate-900 p-2 text-center"><img src={previewImages[0]} alt="Preview PDF" className="max-w-full h-auto mx-auto shadow-sm rounded-lg" /></div></div>)}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mata Pelajaran / Materi</label>
                                    <input type="text" value={aiConfig.subject} onChange={(e) => setAiConfig({...aiConfig, subject: e.target.value})} className="w-full p-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm text-slate-800 dark:text-slate-200" placeholder="Contoh: Biologi - Sel" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Jumlah Soal</label>
                                    <input type="number" min="1" max="20" value={aiConfig.count} onChange={(e) => setAiConfig({...aiConfig, count: parseInt(e.target.value) || 5})} className="w-full p-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm text-slate-800 dark:text-slate-200" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Jenis Soal</label>
                                    <select value={aiConfig.type} onChange={(e) => setAiConfig({...aiConfig, type: e.target.value})} className="w-full p-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm text-slate-800 dark:text-slate-200">
                                        <option value="Pilihan Ganda">Pilihan Ganda</option>
                                        <option value="Pilihan Ganda Kompleks">Pilihan Ganda Kompleks</option>
                                        <option value="Benar/Salah">Benar/Salah</option>
                                        <option value="Menjodohkan">Menjodohkan</option>
                                        <option value="Uraian Singkat">Uraian Singkat</option>
                                        <option value="Esai">Esai</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tingkat Kognitif</label>
                                    <select value={aiConfig.difficulty} onChange={(e) => setAiConfig({...aiConfig, difficulty: e.target.value})} className="w-full p-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm text-slate-800 dark:text-slate-200">
                                        <option value="C1 - Mengingat">C1 - Mengingat</option>
                                        <option value="C2 - Memahami">C2 - Memahami</option>
                                        <option value="C3 - Mengaplikasikan">C3 - Mengaplikasikan</option>
                                        <option value="C4 - Menganalisis">C4 - Menganalisis</option>
                                        <option value="C5 - Mengevaluasi">C5 - Mengevaluasi</option>
                                        <option value="C6 - Mencipta">C6 - Mencipta</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kisi-kisi / Konteks Tambahan (Opsional)</label>
                                <textarea value={aiConfig.blueprint} onChange={(e) => setAiConfig({...aiConfig, blueprint: e.target.value})} className="w-full h-24 p-3 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm resize-y text-slate-800 dark:text-slate-200" placeholder="Contoh: Fokus pada perbedaan sel hewan dan sel tumbuhan..." />
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="includeImages" checked={aiConfig.includeImages} onChange={(e) => setAiConfig({...aiConfig, includeImages: e.target.checked})} className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary dark:focus:ring-primary dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
                                <label htmlFor="includeImages" className="text-sm font-medium text-slate-700 dark:text-slate-300">Sertakan Gambar Referensi (dari Wikimedia Commons)</label>
                            </div>
                        </div>
                    )}
                    {error && (<div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm rounded-xl flex items-start gap-2 border border-red-100 dark:border-red-900"><span className="font-bold">Error:</span> {error}</div>)}
                    <div className="mt-6 flex justify-end"><button onClick={handleStartAnalysis} disabled={isLoading || (inputMethod === 'upload' && !uploadedFile) || (inputMethod === 'ai' && !aiConfig.subject)} className={`w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all ${isLoading || (inputMethod === 'upload' && !uploadedFile) || (inputMethod === 'ai' && !aiConfig.subject) ? 'bg-gray-400 dark:bg-slate-600 cursor-not-allowed' : 'bg-primary hover:bg-primary-focus hover:shadow-lg transform hover:-translate-y-0.5'}`}>{isLoading ? (<><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> Memproses...</>) : (<><CogIcon className="w-5 h-5" />{inputMethod === 'upload' ? 'Analisis & Crop PDF' : 'Buat Soal dengan AI'}</>)}</button></div>
                </div>
            </div>
        </div>
    );
};
