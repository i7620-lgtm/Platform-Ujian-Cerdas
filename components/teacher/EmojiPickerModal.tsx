import React, { useState } from 'react';

const EMOJI_CATEGORIES = [
    {
        id: 'all',
        name: 'Semua',
        emojis: [] // Akan diisi di bawah
    },
    {
        id: 'expression',
        name: 'Ekspresi',
        emojis: [
            '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚',
            '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
            '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓',
            '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣',
            '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾'
        ]
    },
    {
        id: 'animal',
        name: 'Hewan',
        emojis: [
            '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒',
            '🐔', '🐧', '🐦', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🪰',
            '🪲', '🪳', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳',
            '🐋', '🦈', '🦭', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🦣', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄'
        ]
    },
    {
        id: 'vehicle',
        name: 'Kendaraan',
        emojis: [
            '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🦯', '🦽', '🦼', '🛴', '🚲', '🛵',
            '🏍️', '🛺', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇',
            '🚊', '🚉', '✈️', '🛫', '🛬', '🛩️', '💺', '🛰️', '🚀', '🛸', '🚁', '🛶', '⛵', '🚤', '🛥️', '🛳️', '⛴️', '🚢', '⚓', '🛤️'
        ]
    },
    {
        id: 'profession',
        name: 'Pekerjaan & Orang',
        emojis: [
            '👦', '👧', '👨', '👩', '👨‍🏫', '👩‍🏫', '🧑‍🎓', '👨‍⚕️', '👩‍⚕️', '👮', '👮‍♂️', '👮‍♀️', '🕵️', '🕵️‍♂️', '🕵️‍♀️', '💂', '💂‍♂️', '💂‍♀️', '👷', '👷‍♂️',
            '👷‍♀️', '🧑‍⚕️', '🧑‍🎓', '🧑‍🏫', '🧑‍⚖️', '🧑‍🌾', '🧑‍🍳', '🧑‍🔧', '🧑‍🏭', '🧑‍💼', '🧑‍🔬', '🧑‍💻', '🧑‍🎤', '🧑‍🎨', '🧑‍✈️', '🧑‍🚀', '🧑‍🚒', '👮', '🕵️', '💂',
            '👤', '👥', '🧒', '👶'
        ]
    },
    {
        id: 'food',
        name: 'Buah & Makanan',
        emojis: [
            '🍎', '🍓', '🍏', '🍔', '🍕', '🍰', '☕', '🍦', '🍉', '🍌', '🥕', '🥦', '🍇', '🍈', '🍊', '🍋', '🍍', '🥭', '🍒', '🍑',
            '🍐', '🥝', '🍅', '🥥', '🥑', '🍆', '🥔', '🌽', '🌶️', '🫑', '🥒', '🥬', '🧅', '🍄', '🥜', '🌰', '🍞', '🥐', '🥖', '🫓'
        ]
    },
    {
        id: 'symbols',
        name: 'Simbol',
        emojis: [
            '👍', '👎', '👏', '🙏', '💪', '🎉', '✨', '❤️', '🔥', '💯', '✅', '❌', '⭐', '🏀', '⚽', '📚', '✏️', '💻', '🏠', '🎈',
            '☀️', '👟', '👕', '💰', '💶', '🪙'
        ]
    }
];

// Fill the 'all' category
EMOJI_CATEGORIES[0].emojis = EMOJI_CATEGORIES.slice(1).reduce((acc, cat) => acc.concat(cat.emojis), [] as string[]);

interface EmojiPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onInsert: (emoji: string) => void;
}

const EmojiPickerModal: React.FC<EmojiPickerModalProps> = ({ isOpen, onClose, onInsert }) => {
    const [selectedCategoryId, setSelectedCategoryId] = useState('all');

    if (!isOpen) return null;

    const currentEmojis = EMOJI_CATEGORIES.find(c => c.id === selectedCategoryId)?.emojis || [];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-6 lg:p-8">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50 shrink-0">
                    <h3 className="font-bold text-gray-700 dark:text-slate-200 text-lg">Pilih Simbol / Emoji</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 transition-colors bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 p-2 rounded-full">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                
                {/* Category Filter */}
                <div className="p-3 border-b border-gray-100 dark:border-slate-700 overflow-x-auto shrink-0 flex gap-2 no-scrollbar">
                    {EMOJI_CATEGORIES.map(category => (
                        <button
                            key={category.id}
                            onClick={() => setSelectedCategoryId(category.id)}
                            className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                                selectedCategoryId === category.id 
                                    ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 border-2 border-sky-200 dark:border-sky-800' 
                                    : 'bg-white text-gray-600 dark:bg-slate-700 dark:text-gray-300 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600'
                            }`}
                        >
                            {category.name}
                        </button>
                    ))}
                </div>

                <div className="p-4 sm:p-5 overflow-y-auto flex-1 h-[400px]">
                    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2 sm:gap-3 content-start">
                        {currentEmojis.map((emoji, index) => (
                            <button
                                key={index}
                                onClick={(e) => {
                                    e.preventDefault();
                                    onInsert(emoji);
                                    onClose();
                                }}
                                className="text-[28px] sm:text-[32px] leading-none p-2 sm:p-3 hover:bg-sky-50 focus:bg-sky-50 dark:hover:bg-slate-700 dark:focus:bg-slate-700 rounded-xl transition-all hover:scale-110 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                                title="Pilih Emoji"
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
