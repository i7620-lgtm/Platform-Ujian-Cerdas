import React, { useState, useEffect } from 'react';
import type { UserProfile, AccountType } from '../../../types';
import { storageService } from '../../../services/storage';
import { UserIcon } from '../../Icons';
import { supabase } from '../../../lib/supabase';

// Extended type for UI
interface UserProfileWithStats extends UserProfile {
    stats?: {
        questionsCount: number;
        examsCount: number;
        uniqueStudents: number;
        totalStudentTimeMins: number;
        teacherAccessMins: number | string;
    };
}

export const UserManagementView: React.FC = () => {
    const [users, setUsers] = useState<UserProfileWithStats[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [newRole, setNewRole] = useState<AccountType>('guru');
    const [newSchool, setNewSchool] = useState('');
    const [isPremium, setIsPremium] = useState<boolean>(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch Users
            const data = await storageService.getAllUsers();
            
            // 2. Fetch Exams (we need to know author_id, config)
            const { data: examsData } = await supabase.from('exams').select('code, author_id, questions, config');
            
            // 3. Fetch Results 
            const { data: resultsData } = await supabase.from('results').select('exam_code, student_id, updated_at');
            
            // 4. Summaries 
            const { data: summariesData } = await supabase.from('exam_summaries').select('*');
            
            // 5. Cloud Archives (to cover any files missing from exam_summaries)
            const cloudArchives = await storageService.getArchivedList();
            
            // Calculate stats for each user
            const usersWithStats = data.map(user => {
                const userExams = (examsData || []).filter((e: any) => e.author_id === user.id);
                const userExamCodes = userExams.map((e: any) => e.code);
                
                const questionsCount = userExams.reduce((sum: number, e: any) => sum + (Array.isArray(e.questions) ? e.questions.length : 0), 0);
                
                // Fetch results FOR exams authored by this user
                const userResults = (resultsData || []).filter((r: any) => userExamCodes.includes(r.exam_code));
                
                // Get summaries ONLY for exams authored by this user
                const userSummaries = (summariesData || []).filter((s: any) => {
                     if (s.author_id) {
                         return s.author_id === user.id;
                     }
                     // Fallback for legacy items without author_id
                     const isOwnActiveExam = userExamCodes.includes(s.exam_code);
                     return isOwnActiveExam;
                });
                
                // Cloud Archives authored by this user
                const userCloudArchives = cloudArchives.filter((f: any) => f.metadata && f.metadata.authorId === user.id);
                
                // Unique students based on results + max of (summaries, cloud archives)
                const studentsFromResults = new Set(userResults.map((r: any) => r.student_id)).size;
                const studentsFromSummaries = userSummaries.reduce((sum: number, s: any) => sum + (s.total_participants || 0), 0);
                const studentsFromCloudArchives = userCloudArchives.reduce((sum: number, arch: any) => sum + (Number(arch.metadata?.participantCount) || 0), 0);
                
                // We use Math.max to avoid double counting between SQL table and Storage bucket
                const uniqueStudents = studentsFromResults + Math.max(studentsFromSummaries, studentsFromCloudArchives);
                
                // Total student access time
                let totalStudentTimeMins = 0;
                
                // From active results:
                userResults.forEach((r: any) => {
                    const exam = userExams.find((e: any) => e.code === r.exam_code);
                    const timeLimit = exam?.config?.timeLimit || 60; // fallback est
                    totalStudentTimeMins += timeLimit; 
                });

                // From summaries:
                let summariesTimeMins = 0;
                userSummaries.forEach((s: any) => {
                    // Cek jika tabel SQL dimodifikasi pengguna dengan custom waktu
                    const dbTime = s.total_student_time || s.total_time || s.access_time || s.waktu_akses;
                    if (dbTime) {
                        summariesTimeMins += Number(dbTime);
                    } else {
                        const exam = userExams.find((e: any) => e.code === s.exam_code);
                        const timeLimit = exam?.config?.timeLimit || 60;
                        summariesTimeMins += (s.total_participants || 0) * timeLimit;
                    }
                });
                
                // From cloud archives (assume 60 mins fallback)
                let cloudArchiveTimeMins = 0;
                userCloudArchives.forEach((arch: any) => {
                     cloudArchiveTimeMins += (Number(arch.metadata?.participantCount) || 0) * 60;
                });
                
                totalStudentTimeMins += Math.max(summariesTimeMins, cloudArchiveTimeMins);
                
                // Estimate teacher access time (45 menit per ujian + waktu view hasil)
                // For exams created count we also include cloud archives, taking the max of distinct codes
                const totalExamsCreated = Math.max(userExams.length, userSummaries.length, userCloudArchives.length); 
                let teacherAccess = 0;
                if (totalExamsCreated > 0) {
                     teacherAccess = (totalExamsCreated * 45) + Math.round(uniqueStudents * 1.5);
                }
                const teacherAccessMins = teacherAccess > 0 ? teacherAccess : 'Tidak Tercatat';
                
                return {
                    ...user,
                    stats: {
                       questionsCount,
                       uniqueStudents,
                       totalStudentTimeMins,
                       examsCount: totalExamsCreated,
                       teacherAccessMins
                    }
                };
            });

            setUsers(usersWithStats);
        } catch (e) {
            console.error("Gagal memuat pengguna:", e);
            alert("Gagal memuat daftar pengguna.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditClick = (user: UserProfile) => {
        setEditingUser(user);
        setNewRole(user.accountType);
        setNewSchool(user.school);
        setIsPremium(user.isPremium || false);
    };

    const handleSaveUser = async () => {
        if (!editingUser) return;
        try {
            await storageService.updateUserRole(editingUser.id, newRole, newSchool, isPremium);
            setEditingUser(null);
            fetchUsers();
            alert("Pengguna berhasil diperbarui.");
        } catch (e) {
            console.error(e);
            alert("Gagal memperbarui pengguna.");
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-800 rounded-lg text-white"><UserIcon className="w-6 h-6" /></div>
                <div><h2 className="text-2xl font-bold text-neutral dark:text-white">Kelola Pengguna</h2><p className="text-sm text-gray-500 dark:text-slate-400">Manajemen akses dan penempatan sekolah.</p></div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden overflow-x-auto custom-scrollbar">
                <table className="w-full text-left min-w-[1000px]">
                    <thead className="bg-slate-50/50 dark:bg-slate-700/50">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Nama / Email</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Aktivitas Guru</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Aktivitas Siswa</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Role & Sekolah</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                        {isLoading ? (
                             <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400 dark:text-slate-500">Memuat data pengguna...</td></tr>
                        ) : users.length > 0 ? (
                            users.map(user => (
                                <tr key={user.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-700/30">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{user.fullName}</div>
                                        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{user.email || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs text-slate-700 dark:text-slate-300"><span className="font-semibold text-slate-900 dark:text-slate-100">{user.stats?.questionsCount || 0}</span> Soal dibuat</div>
                                        <div className="text-[10px] text-slate-500 mt-1">Waktu akses: {user.stats?.teacherAccessMins === 'Tidak Tercatat' ? user.stats.teacherAccessMins : `~${user.stats?.teacherAccessMins} menit`}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs text-slate-700 dark:text-slate-300"><span className="font-semibold text-emerald-600 dark:text-emerald-400">{user.stats?.uniqueStudents || 0}</span> Siswa mengejakan</div>
                                        <div className="text-[10px] text-slate-500 mt-1">Total waktu: <span className="font-medium text-slate-700 dark:text-slate-300">{user.stats?.totalStudentTimeMins || 0}</span> menit</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1 items-start">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                                user.accountType === 'super_admin' ? 'bg-slate-800 text-white' : 
                                                user.accountType === 'admin_sekolah' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                                            }`}>
                                                {user.accountType.replace('_', ' ')}
                                            </span>
                                            <span className="text-[10px] font-medium text-slate-500">{user.school}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleEditClick(user)} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline">Edit</button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400 dark:text-slate-500">Tidak ada pengguna ditemukan.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {editingUser && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6 border border-white dark:border-slate-700">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Edit Pengguna</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Nama</label>
                                <input type="text" value={editingUser.fullName} disabled className="w-full p-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-400 dark:text-slate-500 cursor-not-allowed" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Role</label>
                                <select value={newRole} onChange={(e) => setNewRole(e.target.value as AccountType)} className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none text-slate-800 dark:text-slate-200">
                                    <option value="guru">Guru</option>
                                    <option value="admin_sekolah">Admin Sekolah</option>
                                    <option value="super_admin">Super Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Sekolah</label>
                                <input type="text" value={newSchool} onChange={(e) => setNewSchool(e.target.value)} className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none text-slate-800 dark:text-slate-200" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-2">Tipe Akun (Akses Fitur AI & Realtime)</label>
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="premium_tier" checked={!isPremium} onChange={() => setIsPremium(false)} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300" />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">Freemium (Biasa)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="premium_tier" checked={isPremium} onChange={() => setIsPremium(true)} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300" />
                                        <span className="text-sm font-bold text-amber-600 dark:text-amber-400">Premium</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6 justify-end">
                            <button onClick={() => setEditingUser(null)} className="px-4 py-2 text-sm font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg">Batal</button>
                            <button onClick={handleSaveUser} className="px-4 py-2 text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg shadow-md shadow-indigo-100 dark:shadow-indigo-900/30">Simpan</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
