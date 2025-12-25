
import React, { useState, useEffect } from 'react';
import { Book as BookIcon, Plus, Trash2, BookOpen, Calendar, ArrowLeft, ArrowRight } from 'lucide-react';
import { Book, BookPage, AppView, PageAnalysisResult } from '../types';
import { getBooks, createBook, deleteBook, getBookPages } from '../services/storageService';

interface BookLibraryProps {
    onChangeView: (view: AppView) => void;
    onOpenPage: (page: BookPage) => void;
    onAddPage: (bookId: string) => void;
}

const BookLibrary: React.FC<BookLibraryProps> = ({ onChangeView, onOpenPage, onAddPage }) => {
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newAuthor, setNewAuthor] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    
    // View state: 'library' or 'book_detail'
    const [activeBook, setActiveBook] = useState<Book | null>(null);
    const [pages, setPages] = useState<BookPage[]>([]);

    useEffect(() => {
        loadBooks();
    }, []);

    useEffect(() => {
        if (activeBook) {
            loadPages(activeBook.id);
        }
    }, [activeBook]);

    const loadBooks = async () => {
        setLoading(true);
        try {
            const data = await getBooks();
            setBooks(data);
        } catch (error) {
            console.error("Failed to load books:", error);
            alert("Fehler beim Laden der Bücher. Fehlende Berechtigungen. Prüfe die Browser-Konsole und die Firestore-Regeln.");
            setBooks([]);
        } finally {
            setLoading(false);
        }
    };

    const loadPages = async (bookId: string) => {
        const data = await getBookPages(bookId);
        setPages(data);
    }

    const handleCreateBook = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim() || isCreating) return;

        setIsCreating(true);
        try {
            await createBook(newTitle, newAuthor);
            setShowCreateModal(false);
            setNewTitle('');
            setNewAuthor('');
            loadBooks();
        } catch (error) {
            console.error("Failed to create book:", error);
            alert("Fehler beim Erstellen des Buches. Prüfe die Browser-Konsole für Details.");
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteBook = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm("Buch wirklich löschen? Alle gespeicherten Seiten gehen verloren.")) {
            await deleteBook(id);
            if (activeBook?.id === id) setActiveBook(null);
            loadBooks();
        }
    };

    // --- VIEW: BOOK DETAIL ---
    if (activeBook) {
        return (
            <div className="animate-fade-in pb-24">
                <button 
                    onClick={() => setActiveBook(null)}
                    className="flex items-center gap-2 text-[#6B705C] dark:text-[#A5A58D] hover:text-[#2C2420] dark:hover:text-[#FDFBF7] mb-6 font-bold uppercase text-[10px] tracking-widest transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Zurück zur Bibliothek
                </button>

                <div className="bg-[#2C2420] dark:bg-[#1C1917] p-8 rounded-[2.5rem] shadow-xl text-[#FDFBF7] mb-8 border border-transparent dark:border-[#2C2420] relative overflow-hidden">
                    <div className="relative z-10 flex justify-between items-start">
                        <div>
                             <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60 block mb-2">Buch</span>
                            <h2 className="text-4xl font-serif font-bold mb-1">{activeBook.title}</h2>
                            <p className="font-serif italic text-lg opacity-80">{activeBook.author || 'Unbekannter Autor'}</p>
                            <div className="flex items-center gap-4 mt-6">
                                <span className="bg-white/10 px-3 py-1 rounded-lg text-xs font-mono">{pages.length} Seiten</span>
                                <span className="text-xs opacity-50 font-serif italic">Erstellt am {new Date(activeBook.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <BookIcon className="w-24 h-24 text-white/5 absolute -right-4 -bottom-4 rotate-12" />
                    </div>
                </div>

                <div className="flex justify-between items-center mb-6 px-2">
                    <h3 className="font-serif font-bold text-xl text-[#2C2420] dark:text-[#FDFBF7]">Seiten</h3>
                    <button 
                        onClick={() => onAddPage(activeBook.id)}
                        className="flex items-center gap-2 bg-[#B26B4A] dark:bg-[#D4A373] text-white dark:text-[#12100E] px-5 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-md hover:scale-105 transition-transform"
                    >
                        <Plus className="w-4 h-4" />
                        Seite scannen
                    </button>
                </div>

                {pages.length === 0 ? (
                     <div className="text-center py-12 border-2 border-dashed border-[#EAE2D6] dark:border-[#2C2420] rounded-3xl bg-white/50 dark:bg-[#1C1917]/50">
                        <BookOpen className="w-12 h-12 mx-auto text-[#A5A58D] mb-3" />
                        <p className="text-[#6B705C] dark:text-[#A5A58D] font-serif italic">Dieses Buch hat noch keine Seiten.</p>
                     </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {pages.map((page, idx) => (
                            <div 
                                key={page.id}
                                onClick={() => onOpenPage(page)}
                                className="group bg-white dark:bg-[#1C1917] rounded-2xl overflow-hidden border border-[#EAE2D6] dark:border-[#2C2420] cursor-pointer hover:shadow-lg transition-all hover:border-[#B26B4A]/50 relative aspect-[3/4]"
                            >
                                <div className="absolute inset-0 bg-cover bg-center opacity-90 group-hover:opacity-100 transition-opacity" style={{ backgroundImage: `url(data:image/jpeg;base64,${page.image})` }} />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80" />
                                <div className="absolute bottom-0 left-0 right-0 p-4">
                                    <span className="text-white text-xs font-bold uppercase tracking-widest block mb-1">Seite {page.pageNumber}</span>
                                    <p className="text-white/80 text-[10px] line-clamp-2 font-serif italic">
                                        {page.analysis.sentences[0]?.original.substring(0, 50)}...
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // --- VIEW: LIBRARY LIST ---
    return (
        <div className="animate-fade-in pb-24">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h2 className="text-3xl font-serif font-bold text-[#2C2420] dark:text-[#FDFBF7]">Bibliothek</h2>
                    <p className="text-[#6B705C] dark:text-[#A5A58D] font-serif italic mt-1">Deine Sammlung spanischer Lektüre.</p>
                </div>
                <button 
                    onClick={() => setShowCreateModal(true)}
                    className="bg-[#2C2420] dark:bg-[#D4A373] text-white dark:text-[#12100E] p-4 rounded-2xl shadow-lg hover:scale-105 transition-transform"
                >
                    <Plus className="w-6 h-6" />
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {books.map(book => (
                    <div 
                        key={book.id} 
                        onClick={() => setActiveBook(book)}
                        className={`relative aspect-[3/4] rounded-r-[1.5rem] rounded-l-md shadow-xl cursor-pointer hover:-translate-y-2 transition-transform duration-300 group overflow-hidden ${book.coverStyle || 'bg-[#2C2420]'}`}
                    >
                        {/* Book Spine Effect */}
                        <div className="absolute top-0 bottom-0 left-0 w-4 bg-black/20 z-20 border-r border-white/10" />
                        
                        <div className="absolute inset-0 p-6 flex flex-col justify-between text-[#FDFBF7] z-10 bg-gradient-to-br from-white/10 to-black/20">
                            <div>
                                <h3 className="font-serif font-bold text-2xl leading-tight mb-2 line-clamp-3 drop-shadow-md">{book.title}</h3>
                                <p className="font-serif italic text-sm opacity-80">{book.author}</p>
                            </div>
                            
                            <div className="flex justify-between items-end">
                                <span className="text-[10px] font-bold uppercase tracking-widest bg-black/30 px-2 py-1 rounded backdrop-blur-sm">
                                    {book.pageCount} Seiten
                                </span>
                                <button 
                                    onClick={(e) => handleDeleteBook(e, book.id)}
                                    className="p-2 bg-black/30 rounded-full hover:bg-red-500/80 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
                
                {/* Empty State */}
                {books.length === 0 && !loading && (
                    <div 
                        onClick={() => setShowCreateModal(true)}
                        className="aspect-[3/4] rounded-[1.5rem] border-2 border-dashed border-[#EAE2D6] dark:border-[#2C2420] flex flex-col items-center justify-center text-[#A5A58D] cursor-pointer hover:bg-[#EAE2D6]/20 dark:hover:bg-[#2C2420]/20 transition-colors"
                    >
                        <Plus className="w-12 h-12 mb-4 opacity-50" />
                        <span className="font-bold text-xs uppercase tracking-widest">Erstes Buch erstellen</span>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#12100E]/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-[#FDFBF7] dark:bg-[#1C1917] w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl">
                        <h3 className="text-2xl font-serif font-bold text-[#2C2420] dark:text-[#FDFBF7] mb-6">Neues Buch</h3>
                        <form onSubmit={handleCreateBook} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-[#6B705C] dark:text-[#A5A58D] ml-2 mb-1 block">Titel</label>
                                <input 
                                    autoFocus
                                    disabled={isCreating}
                                    className="w-full bg-white dark:bg-[#12100E] border border-[#EAE2D6] dark:border-[#2C2420] rounded-2xl py-4 px-4 outline-none focus:ring-2 focus:ring-[#B26B4A]/20 disabled:opacity-50"
                                    placeholder="z.B. Harry Potter y la piedra filosofal"
                                    value={newTitle}
                                    onChange={e => setNewTitle(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-[#6B705C] dark:text-[#A5A58D] ml-2 mb-1 block">Autor (Optional)</label>
                                <input 
                                    disabled={isCreating}
                                    className="w-full bg-white dark:bg-[#12100E] border border-[#EAE2D6] dark:border-[#2C2420] rounded-2xl py-4 px-4 outline-none focus:ring-2 focus:ring-[#B26B4A]/20 disabled:opacity-50"
                                    placeholder="z.B. J.K. Rowling"
                                    value={newAuthor}
                                    onChange={e => setNewAuthor(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button 
                                    type="button"
                                    disabled={isCreating}
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest border border-[#EAE2D6] dark:border-[#2C2420] hover:bg-[#EAE2D6]/20 disabled:opacity-50"
                                >
                                    Abbrechen
                                </button>
                                <button 
                                    type="submit"
                                    disabled={!newTitle.trim() || isCreating}
                                    className="flex-1 bg-[#2C2420] dark:bg-[#D4A373] text-white dark:text-[#12100E] py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isCreating ? 'Wird erstellt...' : 'Erstellen'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BookLibrary;
