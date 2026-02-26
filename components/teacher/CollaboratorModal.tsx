import React, { useState } from 'react';
import { Exam, Collaborator } from '../../types';
import { storageService } from '../../services/storage';
import { XMarkIcon, LinkIcon, DocumentDuplicateIcon, ArrowPathIcon, ShieldCheckIcon, PencilIcon, TrashIcon } from '../Icons';

interface CollaboratorModalProps {
    exam: Exam;
    onClose: () => void;
    onUpdate: () => void;
}

export const CollaboratorModal: React.FC<CollaboratorModalProps> = ({ exam, onClose, onUpdate }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [copiedRole, setCopiedRole] = useState<'viewer' | 'editor' | null>(null);

    const collaborators = exam.config.collaborators || [];

    // Find active shared links (most recent one for each role)
    const viewerCollaborator = collaborators
        .filter(c => c.role === 'viewer')
        .sort((a, b) => b.createdAt - a.createdAt)[0];

    const editorCollaborator = collaborators
        .filter(c => c.role === 'editor')
        .sort((a, b) => b.createdAt - a.createdAt)[0];

    const handleCreateLink = async (role: 'viewer' | 'editor') => {
        setIsLoading(true);
        try {
            const label = role === 'viewer' ? 'Pengawas (Shared)' : 'Editor (Shared)';
            await storageService.addCollaborator(exam.code, label, role);
            onUpdate();
        } catch (e) {
            alert('Gagal membuat link.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetLink = async (role: 'viewer' | 'editor', oldToken: string) => {
        if (!confirm('Link lama akan hangus dan link baru akan dibuat. Lanjutkan?')) return;
        setIsLoading(true);
        try {
            await storageService.removeCollaborator(exam.code, oldToken);
            const label = role === 'viewer' ? 'Pengawas (Shared)' : 'Editor (Shared)';
            await storageService.addCollaborator(exam.code, label, role);
            onUpdate();
        } catch (e) {
            alert('Gagal mereset link.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteLink = async (token: string) => {
        if (!confirm('Link ini akan dinonaktifkan. Lanjutkan?')) return;
        setIsLoading(true);
        try {
            await storageService.removeCollaborator(exam.code, token);
            onUpdate();
        } catch (e) {
            alert('Gagal menghapus link.');
        } finally {
            setIsLoading(false);
        }
    };

    const getLink = (token: string) => {
        const url = new URL(window.location.href);
        url.searchParams.set('collab_code', exam.code);
        url.searchParams.set('collab_token', token);
        url.searchParams.delete('view');
        url.searchParams.delete('preview');
        url.searchParams.delete('join');
        url.searchParams.delete('live');
        return url.toString();
    };

    const copyLink = (token: string, role: 'viewer' | 'editor') => {
        navigator.clipboard.writeText(getLink(token));
        setCopiedRole(role);
        setTimeout(() => setCopiedRole(null), 2000);
    };

    const renderRow = (role: 'viewer' | 'editor', collaborator?: Collaborator) => {
        const isViewer = role === 'viewer';
        const title = isViewer ? 'Pengawas (Live Monitor)' : 'Editor (Edit Soal)';
        const desc = isViewer 
            ? 'Akses pantauan ujian, edit data siswa, dan buat token.' 
            : 'Akses penuh untuk mengedit soal dan konfigurasi ujian.';
        const Icon = isViewer ? ShieldCheckIcon : PencilIcon;
        const colorClass = isViewer ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-amber-600 bg-amber-50 border-amber-100';

        return (
            <div className={`p-4 rounded-2xl border ${collaborator ? 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700' : 'bg-slate-50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-700'} transition-all`}>
                <div className="flex items-start gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${colorClass} shrink-0`}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-800 dark:text-white text-base truncate">{title}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">{desc}</p>
                    </div>
                    {!collaborator && (
                        <button 
                            onClick={() => handleCreateLink(role)}
                            disabled={isLoading}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors shadow-md shadow-indigo-200 dark:shadow-none disabled:opacity-50 whitespace-nowrap"
                        >
                            Aktifkan
                        </button>
                    )}
                </div>

                {collaborator && (
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="p-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 text-slate-400 shrink-0">
                            <LinkIcon className="w-3.5 h-3.5" />
                        </div>
                        <input 
                            readOnly 
                            value={getLink(collaborator.token)} 
                            className="flex-1 bg-transparent text-xs font-mono text-slate-600 dark:text-slate-300 outline-none truncate px-1 min-w-0"
                        />
                        <div className="flex items-center gap-1 shrink-0">
                            <button 
                                onClick={() => copyLink(collaborator.token, role)}
                                className="p-1.5 hover:bg-white dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-lg transition-colors font-bold text-[10px] flex items-center gap-1"
                            >
                                {copiedRole === role ? (
                                    <span>Disalin!</span>
                                ) : (
                                    <>
                                        <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">Salin</span>
                                    </>
                                )}
                            </button>
                            <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 mx-0.5"></div>
                            <button 
                                onClick={() => handleResetLink(role, collaborator.token)}
                                disabled={isLoading}
                                className="p-1.5 hover:bg-white dark:hover:bg-slate-800 text-slate-500 hover:text-amber-600 rounded-lg transition-colors"
                                title="Reset Link"
                            >
                                <ArrowPathIcon className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>
                            <button 
                                onClick={() => handleDeleteLink(collaborator.token)}
                                disabled={isLoading}
                                className="p-1.5 hover:bg-white dark:hover:bg-slate-800 text-slate-500 hover:text-rose-600 rounded-lg transition-colors"
                                title="Hapus Link"
                            >
                                <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl border border-white dark:border-slate-700 overflow-hidden flex flex-col animate-slide-in-up max-h-[90vh]">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 shrink-0">
                    <div>
                        <h3 className="font-black text-lg text-slate-800 dark:text-white tracking-tight">Kelola Kolaborator</h3>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Bagikan akses pengelolaan ujian kepada rekan tim.</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full transition-colors">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-5 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col gap-3 overflow-y-auto">
                    {renderRow('viewer', viewerCollaborator)}
                    {renderRow('editor', editorCollaborator)}
                </div>
            </div>
        </div>
    );
};
