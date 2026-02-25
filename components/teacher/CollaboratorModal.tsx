import React, { useState } from 'react';
import { Exam, Collaborator } from '../../types';
import { storageService } from '../../services/storage';
import { XMarkIcon, UserIcon, TrashIcon, LinkIcon, DocumentDuplicateIcon } from '../Icons';

interface CollaboratorModalProps {
    exam: Exam;
    onClose: () => void;
    onUpdate: () => void;
}

export const CollaboratorModal: React.FC<CollaboratorModalProps> = ({ exam, onClose, onUpdate }) => {
    const [label, setLabel] = useState('');
    const [role, setRole] = useState<'editor' | 'viewer'>('viewer');
    const [isLoading, setIsLoading] = useState(false);
    const [copiedToken, setCopiedToken] = useState<string | null>(null);

    const handleAdd = async () => {
        if (!label.trim()) return;
        setIsLoading(true);
        try {
            await storageService.addCollaborator(exam.code, label, role);
            setLabel('');
            onUpdate();
        } catch (e) {
            alert('Gagal menambahkan kolaborator');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemove = async (token: string) => {
        if (!confirm('Hapus kolaborator ini?')) return;
        setIsLoading(true);
        try {
            await storageService.removeCollaborator(exam.code, token);
            onUpdate();
        } catch (e) {
            alert('Gagal menghapus kolaborator');
        } finally {
            setIsLoading(false);
        }
    };

    const getLink = (token: string) => {
        const url = new URL(window.location.href);
        url.searchParams.set('collab_code', exam.code);
        url.searchParams.set('collab_token', token);
        // Remove other params to keep it clean
        url.searchParams.delete('view');
        url.searchParams.delete('preview');
        url.searchParams.delete('join');
        url.searchParams.delete('live');
        return url.toString();
    };

    const copyLink = (token: string) => {
        navigator.clipboard.writeText(getLink(token));
        setCopiedToken(token);
        setTimeout(() => setCopiedToken(null), 2000);
    };

    const collaborators = exam.config.collaborators || [];

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100 dark:border-slate-700 flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">Kelola Kolaborator</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <XMarkIcon className="w-5 h-5 text-slate-500" />
                    </button>
                </div>
                
                <div className="p-5 overflow-y-auto flex-1">
                    <div className="flex gap-2 mb-6">
                        <input 
                            type="text" 
                            placeholder="Nama (cth: Pak Budi)" 
                            className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                            value={label}
                            onChange={e => setLabel(e.target.value)}
                        />
                        <select 
                            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                            value={role}
                            onChange={e => setRole(e.target.value as any)}
                        >
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                        </select>
                        <button 
                            onClick={handleAdd}
                            disabled={isLoading || !label.trim()}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                            Tambah
                        </button>
                    </div>

                    <div className="space-y-3">
                        {collaborators.length === 0 ? (
                            <p className="text-center text-slate-400 text-sm py-4">Belum ada kolaborator.</p>
                        ) : (
                            collaborators.map(c => (
                                <div key={c.token} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700 flex flex-col gap-3">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                                <UserIcon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{c.label}</p>
                                                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${c.role === 'editor' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                    {c.role}
                                                </span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleRemove(c.token)}
                                            className="text-slate-400 hover:text-rose-500 transition-colors"
                                            title="Hapus Akses"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-600">
                                        <LinkIcon className="w-3 h-3 text-slate-400" />
                                        <input 
                                            readOnly 
                                            value={getLink(c.token)} 
                                            className="flex-1 text-xs bg-transparent text-slate-500 outline-none truncate"
                                        />
                                        <button 
                                            onClick={() => copyLink(c.token)}
                                            className="text-indigo-600 hover:text-indigo-700 text-xs font-bold px-2"
                                        >
                                            {copiedToken === c.token ? 'Disalin!' : 'Salin'}
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
