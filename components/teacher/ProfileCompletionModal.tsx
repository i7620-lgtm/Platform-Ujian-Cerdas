
import React, { useState } from 'react';
import { UserIcon, CheckCircleIcon } from '../Icons';
import type { TeacherProfile } from '../../types';
import { storageService } from '../../services/storage';

interface ProfileCompletionModalProps {
    profile: TeacherProfile;
    onComplete: (updatedProfile: TeacherProfile) => void;
}

export const ProfileCompletionModal: React.FC<ProfileCompletionModalProps> = ({ profile, onComplete }) => {
    const [fullName, setFullName] = useState(profile.fullName === 'Pengguna' ? '' : profile.fullName);
    const [school, setSchool] = useState(profile.school === '-' ? '' : profile.school);
    const [regency, setRegency] = useState(profile.regency === '-' ? '' : (profile.regency || ''));
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fullName || !school || !regency) {
            setError("Mohon lengkapi semua data profil.");
            return;
        }

        setIsLoading(true);
        try {
            const updates = {
                fullName,
                school,
                regency,
                accountType: profile.accountType
            };
            await storageService.updateTeacherProfile(profile.id, updates);
            onComplete({ ...profile, ...updates });
        } catch (err: unknown) {
            const error = err as Error;
            setError(error.message || "Gagal memperbarui profil.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-white dark:border-slate-800 animate-gentle-slide">
                <div className="p-8 sm:p-10">
                    <div className="flex justify-center mb-8">
                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl text-indigo-600 dark:text-indigo-400">
                            <UserIcon className="w-10 h-10" />
                        </div>
                    </div>

                    <h2 className="text-2xl font-black text-slate-800 dark:text-white text-center mb-2 tracking-tight">Lengkapi Profil</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-8 font-medium">
                        Mohon lengkapi data diri Anda untuk melanjutkan penggunaan aplikasi.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nama Lengkap</label>
                            <input 
                                type="text" 
                                value={fullName} 
                                onChange={(e) => setFullName(e.target.value)} 
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-200 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 rounded-xl outline-none mt-1 text-sm font-bold text-slate-700 dark:text-slate-200 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600" 
                                placeholder="Contoh: Budi Santoso, S.Pd"
                                required 
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nama Sekolah</label>
                            <input 
                                type="text" 
                                value={school} 
                                onChange={(e) => setSchool(e.target.value)} 
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-200 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 rounded-xl outline-none mt-1 text-sm font-bold text-slate-700 dark:text-slate-200 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600" 
                                placeholder="Contoh: SMA Negeri 1 Jakarta"
                                required 
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Kabupaten/Kota</label>
                            <input 
                                type="text" 
                                value={regency} 
                                onChange={(e) => setRegency(e.target.value)} 
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-200 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 rounded-xl outline-none mt-1 text-sm font-bold text-slate-700 dark:text-slate-200 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600" 
                                placeholder="Contoh: Jakarta Selatan"
                                required 
                            />
                        </div>

                        {error && (
                            <p className="text-xs font-bold text-rose-500 text-center">{error}</p>
                        )}

                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl hover:bg-indigo-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-50"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <span>Simpan Profil</span>
                                    <CheckCircleIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
