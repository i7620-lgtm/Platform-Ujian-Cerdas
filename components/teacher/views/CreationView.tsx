import React, { useState, useEffect } from 'react';
import type { Question } from '../../../types';
import { extractTextFromPdf, parsePdfAndAutoCrop, convertPdfToImages, parseQuestionsFromPlainText } from '../examUtils';
import { PencilIcon, CloudArrowUpIcon, ListBulletIcon, FileTextIcon, CogIcon } from '../../Icons';

interface CreationViewProps { onQuestionsGenerated: (questions: Question[], mode: 'manual' | 'auto') => void; }
type InputMethod = 'paste' | 'upload';

export const CreationView: React.FC<CreationViewProps> = ({ onQuestionsGenerated }) => {
    const [inputMethod, setInputMethod] = useState<InputMethod>('upload');
    const [inputText, setInputText] = useState('');
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [previewImages, setPreviewImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadPreview = async () => {
            if (uploadedFile && uploadedFile.type === 'application/pdf') {
                try { const images = await convertPdfToImages(uploadedFile, 1.5); setPreviewImages(images); } catch (e) { console.error("Gagal memuat pratinjau PDF:", e); setPreviewImages([]); }
            } else { setPreviewImages([]); }
        };
        loadPreview();
    }, [uploadedFile]);

    const handleExtractText = async () => { if (!uploadedFile) return; setIsLoading(true); try { const text = await extractTextFromPdf(uploadedFile); setInputText(text); setInputMethod('paste'); } catch (e) { setError("Gagal mengekstrak teks dari PDF."); } finally { setIsLoading(false); } };
    const handleDirectManualTransfer = () => { if (!inputText.trim()) { setError("Tidak ada teks untuk ditransfer."); return; } const blocks = inputText.split(/\n\s*\n/); const newQuestions: Question[] = blocks.filter(b => b.trim().length > 0).map((block, index) => ({ id: `manual-q-${Date.now()}-${index}`, questionText: block.trim(), questionType: 'ESSAY', options: [], correctAnswer: '', imageUrl: undefined, optionImages: undefined })); onQuestionsGenerated(newQuestions, 'manual'); };
    const handleStartAnalysis = async () => { setIsLoading(true); setError(''); try { if (inputMethod === 'paste') { if (!inputText.trim()) throw new Error("Silakan tempel konten soal terlebih dahulu."); const parsedQuestions = parseQuestionsFromPlainText(inputText); if (parsedQuestions.length === 0) throw new Error("Tidak dapat menemukan soal yang valid. Pastikan format soal menggunakan penomoran (1. Soal) dan opsi (A. Opsi)."); onQuestionsGenerated(parsedQuestions, 'auto'); } else if (inputMethod === 'upload' && uploadedFile) { if (uploadedFile.type !== 'application/pdf') throw new Error("Fitur ini hanya mendukung file PDF."); const parsedQuestions = await parsePdfAndAutoCrop(uploadedFile); if (parsedQuestions.length === 0) throw new Error("Tidak dapat menemukan soal yang valid dari PDF. Pastikan format soal jelas."); onQuestionsGenerated(parsedQuestions, 'manual'); } else { throw new Error("Silakan pilih file untuk diunggah."); } } catch (err) { setError(err instanceof Error ? err.message : 'Gagal memproses file.'); } finally { setIsLoading(false); } };
    const handleManualCreateClick = () => { setInputText(''); setUploadedFile(null); setError(''); onQuestionsGenerated([], 'manual'); };

    return (
        <div className="max-w-4xl mx-auto animate-fade-in space-y-12">
            <div className="space-y-8"><div className="text-center space-y-4"><h2 className="text-3xl font-bold text-neutral dark:text-white">Buat Ujian Baru</h2><p className="text-gray-500 dark:text-slate-400 max-w-2xl mx-auto">Mulai dengan mengunggah soal dalam format PDF, menempelkan teks soal, atau membuat soal secara manual. Sistem kami akan membantu Anda menyusun ujian dengan mudah.</p></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6"><div className={`p-6 border-2 rounded-2xl cursor-pointer transition-all duration-300 group border-gray-100 dark:border-slate-700 hover:border-primary/50 dark:hover:border-primary/50 hover:shadow-lg bg-white dark:bg-slate-800`} onClick={handleManualCreateClick}><div className="flex flex-col items-center text-center space-y-3"><div className={`p-4 rounded-2xl transition-colors bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-slate-300 group-hover:bg-primary/10 group-hover:text-primary`}><PencilIcon className="w-8 h-8" /></div><h3 className="font-bold text-lg text-neutral dark:text-white">Buat Manual</h3><p className="text-sm text-gray-500 dark:text-slate-400">Buat soal dari awal secara manual tanpa impor file atau teks.</p></div></div><div className={`p-6 border-2 rounded-2xl cursor-pointer transition-all duration-300 group ${inputMethod === 'upload' ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-md' : 'border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary/50 hover:shadow-lg'}`} onClick={() => setInputMethod('upload')}><div className="flex flex-col items-center text-center space-y-3"><div className={`p-4 rounded-2xl transition-colors ${inputMethod === 'upload' ? 'bg-primary text-white' : 'bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-slate-300 group-hover:bg-primary/10 group-hover:text-primary'}`}><CloudArrowUpIcon className="w-8 h-8" /></div><h3 className="font-bold text-lg text-neutral dark:text-white">Unggah PDF Soal</h3><p className="text-sm text-gray-500 dark:text-slate-400">Sistem akan otomatis mendeteksi dan memotong soal dari file PDF Anda.</p></div></div><div className={`p-6 border-2 rounded-2xl cursor-pointer transition-all duration-300 group ${inputMethod === 'paste' ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-md' : 'border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary/50 hover:shadow-lg'}`} onClick={() => setInputMethod('paste')}><div className="flex flex-col items-center text-center space-y-3"><div className={`p-4 rounded-2xl transition-colors ${inputMethod === 'paste' ? 'bg-primary text-white' : 'bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-slate-300 group-hover:bg-primary/10 group-hover:text-primary'}`}><ListBulletIcon className="w-8 h-8" /></div><h3 className="font-bold text-lg text-neutral dark:text-white">Tempel Teks Soal</h3><p className="text-sm text-gray-500 dark:text-slate-400">Salin dan tempel teks soal langsung dari dokumen Word atau sumber lain.</p></div></div></div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm transition-all duration-300"><div className="mb-4"><h3 className="text-lg font-bold text-neutral dark:text-white mb-1">{inputMethod === 'upload' ? 'Unggah File PDF' : 'Tempel Teks Soal'}</h3><p className="text-sm text-gray-500 dark:text-slate-400">{inputMethod === 'upload' ? 'Pilih file PDF dari perangkat Anda.' : 'Pastikan format soal jelas (nomor dan opsi).'}</p></div>
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
                                            setInputText(''); 
                                        } 
                                    }} 
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                                />
                                <div className="space-y-2 pointer-events-none">
                                    <CloudArrowUpIcon className="w-10 h-10 text-gray-400 dark:text-slate-500 mx-auto" />
                                    {uploadedFile ? (<p className="font-semibold text-primary">{uploadedFile.name}</p>) : (<><p className="text-gray-600 dark:text-slate-300 font-medium">Klik atau seret file PDF ke sini</p><p className="text-xs text-gray-400 dark:text-slate-500">Maksimal ukuran file 10MB</p></>)}
                                </div>
                            </div>
                            {previewImages.length > 0 && (<div className="space-y-2"><p className="text-sm font-semibold text-gray-700 dark:text-slate-300">Pratinjau Halaman Pertama:</p><div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto bg-gray-50 dark:bg-slate-900 p-2 text-center"><img src={previewImages[0]} alt="Preview PDF" className="max-w-full h-auto mx-auto shadow-sm rounded-lg" /></div><div className="flex justify-end"><button onClick={handleExtractText} className="text-sm text-primary hover:underline flex items-center gap-1" disabled={isLoading}><FileTextIcon className="w-4 h-4" /> Ekstrak Teks dari PDF (Jika Auto-Crop Gagal)</button></div></div>)}
                        </div>
                    ) : (<div className="space-y-4"><textarea value={inputText} onChange={(e) => setInputText(e.target.value)} className="w-full h-64 p-4 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary font-mono text-sm resize-y text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600" placeholder={`Contoh Format:\n\n1. Apa ibukota Indonesia?\nA. Bandung\nB. Jakarta\nC. Surabaya\nD. Medan\n\nKunci Jawaban: B`} />{inputText && (<div className="flex justify-end"><button onClick={handleDirectManualTransfer} className="text-sm text-secondary hover:underline flex items-center gap-1"><PencilIcon className="w-4 h-4" /> Gunakan sebagai Soal Manual (Tanpa Parsing Otomatis)</button></div>)}</div>)}
                    {error && (<div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm rounded-xl flex items-start gap-2 border border-red-100 dark:border-red-900"><span className="font-bold">Error:</span> {error}</div>)}
                    <div className="mt-6 flex justify-end"><button onClick={handleStartAnalysis} disabled={isLoading || (!inputText && !uploadedFile)} className={`w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all ${isLoading || (!inputText && !uploadedFile) ? 'bg-gray-400 dark:bg-slate-600 cursor-not-allowed' : 'bg-primary hover:bg-primary-focus hover:shadow-lg transform hover:-translate-y-0.5'}`}>{isLoading ? (<><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> Memproses...</>) : (<><CogIcon className="w-5 h-5" />{inputMethod === 'upload' ? 'Analisis & Crop PDF' : 'Analisis Teks'}</>)}</button></div>
                </div>
            </div>
        </div>
    );
};
