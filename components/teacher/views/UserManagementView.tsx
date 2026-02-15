import React, { useState, useEffect } from 'react';
import type { UserProfile, AccountType } from '../../../types';
import { storageService } from '../../../services/storage';
import { UserIcon } from '../../Icons';

export const UserManagementView: React.FC = () => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [newRole, setNewRole] = useState<AccountType>('guru');
    const [newSchool, setNewSchool] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const data = await storageService.getAllUsers();
            setUsers(data);
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
    };

    const handleSaveUser = async () => {
        if (!editingUser) return;
        try {
            await storageService.updateUserRole(editingUser.id, newRole, newSchool);
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

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50/50 dark:bg-slate-700/50">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Nama / Email</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Sekolah</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Role</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                        {isLoading ? (
                             <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-400 dark:text-slate-500">Memuat data pengguna...</td></tr>
                        ) : users.length > 0 ? (
                            users.map(user => (
                                <tr key={user.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-700/30">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{user.fullName}</div>
                                        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{user.email || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-medium text-slate-600 dark:text-slate-400">{user.school}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                            user.accountType === 'super_admin' ? 'bg-slate-800 text-white' : 
                                            user.accountType === 'admin_sekolah' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                                        }`}>
                                            {user.accountType.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleEditClick(user)} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline">Edit</button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-400 dark:text-slate-500">Tidak ada pengguna ditemukan.</td></tr>
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
