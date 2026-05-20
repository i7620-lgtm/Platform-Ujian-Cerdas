import React from 'react';

const COMMON_EMOJIS = [
    '😀', '😂', '😊', '😍', '🤔', '😎', '😭', '👍', '👎', '👏', '🙏', '💪', '🎉', '✨', '❤️', '🔥', '💯', '✅', '❌', '⭐',
    '🚗', '🚌', '🍎', '🍓', '🏀', '⚽', '📚', '✏️', '💻', '🏠', '🐱', '🐶', '🦊', '🐼', '🐵', '🐸', '🐘', '🦋', '🎈', '☀️',
    '👦', '👧', '👨', '👩', '👨‍🏫', '👩‍🏫', '🧑‍🎓', '👨‍⚕️', '👩‍⚕️', '👮',
    '🍏', '🍔', '🍕', '🍰', '☕', '🍦', '🍉', '🍌', '🥕', '🥦',
    '👤', '👥', '🧒', '👶', '👪', '👟', '👕', '💰', '💶', '🪙'
];

interface EmojiPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onInsert: (emoji: string) => void;
}

const EmojiPickerModal: React.FC<EmojiPickerModalProps> = ({ isOpen, onClose, onInsert }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-gray-700 dark:text-slate-200">Pilih Simbol / Emoji</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="p-4 overflow-y-auto max-h-[350px]">
                    <div className="grid grid-cols-6 gap-2">
                        {COMMON_EMOJIS.map((emoji, index) => (
                            <button
                                key={index}
                                onClick={(e) => {
                                    e.preventDefault();
                                    onInsert(emoji);
                                    onClose();
                                }}
                                className="text-[28px] leading-none p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center justify-center"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmojiPickerModal;
