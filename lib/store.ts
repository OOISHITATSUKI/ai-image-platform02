'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from './supabase';
import type {
    Chat,
    ChatMessage,
    GenerationSettings,
    GenerationType,
    User,
    ThemeMode,
    Locale,
    MediaFilter,
    AspectRatio,
    Resolution,
    TagSettings,
    FetishTag,
} from './types';

// ============================================================
// Per-account chat storage helpers
// ============================================================

async function saveChatsToSupabase(userId: string, chats: Chat[]): Promise<void> {
    try {
        // This is a simplified version. In a real app, you'd handle individual message inserts.
        // For now, mirroring the requirement: save to Supabase.
        const { error } = await supabase
            .from('chats')
            .upsert(chats.map(chat => ({
                id: chat.id,
                user_id: userId,
                name: chat.name,
                updated_at: new Date(chat.updatedAt).toISOString()
            })));

        if (error) throw error;

        for (const chat of chats) {
            const { error: msgErr } = await supabase
                .from('messages')
                .upsert(chat.messages.map(msg => ({
                    id: msg.id,
                    chat_id: chat.id,
                    role: msg.role,
                    content: msg.content,
                    image_url: msg.imageUrl,
                    video_url: msg.videoUrl,
                    thumbnail_url: msg.thumbnailUrl,
                    is_favorite: msg.isFavorite,
                    created_at: new Date(msg.timestamp).toISOString()
                })));
            if (msgErr) throw msgErr;
        }
    } catch (e) {
        console.error('Failed to save chats to Supabase:', e);
    }
}

async function loadChatsFromSupabase(userId: string): Promise<Chat[]> {
    try {
        const { data: chats, error } = await supabase
            .from('chats')
            .select(`
                *,
                messages (*)
            `)
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

        if (error) throw error;

        console.log('Raw chats data from Supabase:', chats);

        return (chats || []).map(chat => ({
            id: chat.id,
            name: chat.name,
            messages: (chat.messages || []).map((msg: any) => ({
                id: msg.id,
                role: msg.role,
                content: msg.content,
                imageUrl: msg.image_url,
                videoUrl: msg.video_url,
                thumbnailUrl: msg.thumbnail_url,
                isFavorite: msg.is_favorite,
                timestamp: new Date(msg.created_at).getTime()
            })),
            createdAt: new Date(chat.created_at).getTime(),
            updatedAt: new Date(chat.updated_at).getTime()
        }));
    } catch (e) {
        console.error('Failed to load chats from Supabase:', e);
        return [];
    }
}

// ============================================================
// App Store (Zustand + localStorage persistence)
// ============================================================

interface AppState {
    // ----- Theme -----
    theme: ThemeMode;
    setTheme: (theme: ThemeMode) => void;
    toggleTheme: () => void;

    // ----- Locale -----
    locale: Locale;
    setLocale: (locale: Locale) => Promise<void>;

    // ----- User -----
    user: User | null;
    isAuthenticated: boolean;
    setUser: (user: User | null) => Promise<void>;
    logout: () => void;

    // ----- Chats -----
    chats: Chat[];
    activeChatId: string | null;
    activeChat: Chat | null;
    createChat: (name?: string) => string;
    renameChat: (id: string, name: string) => void;
    deleteChat: (id: string) => void;
    setActiveChat: (id: string) => void;

    // ----- Messages -----
    addMessage: (chatId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
    toggleFavorite: (chatId: string, messageId: string) => void;

    // ----- Generation Settings -----
    settings: GenerationSettings;
    updateSettings: (partial: Partial<GenerationSettings>) => void;
    setGenerationType: (type: GenerationType) => void;

    // ----- Filters -----
    mediaFilter: MediaFilter;
    setMediaFilter: (filter: MediaFilter) => void;

    // ----- Sidebar -----
    sidebarCollapsed: boolean;
    toggleSidebar: () => void;

    // ----- Settings Panel -----
    settingsPanelVisible: boolean;
    toggleSettingsPanel: () => void;
    setSettingsPanelVisible: (visible: boolean) => void;

    // ----- Age Gate -----
    ageVerified: boolean;
    setAgeVerified: (verified: boolean) => void;

    // ----- Generating -----
    isGenerating: boolean;
    setIsGenerating: (generating: boolean) => void;

    // ----- Tag Settings -----
    tagSettings: TagSettings;
    updateTagSettings: (partial: Partial<TagSettings>) => void;
    toggleFetishTag: (tag: FetishTag) => void;
    resetTagSettings: () => void;

    // ----- Credits -----
    deductCredits: (amount: number) => void;
    addCredits: (amount: number) => void;
}

const DEFAULT_TAG_SETTINGS: TagSettings = {
    breastSize: 50,
    photorealism: 'photorealistic',
    fetish: [],
};

const DEFAULT_SETTINGS: GenerationSettings = {
    generationType: 'txt2img',
    model: 'novita-realistic-vision-6',
    aspectRatio: '9:16',
    resolution: '1024',
    count: 1,
    duration: 5,
    cameraFixed: false,
    qualityPreset: 'ultra',
};

export const useAppStore = create<AppState>()(
    persist(
        (set, get) => ({
            // ----- Theme -----
            theme: 'dark',
            setTheme: (theme) => set({ theme }),
            toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

            // ----- Locale -----
            locale: 'en',
            setLocale: async (locale) => {
                console.log('setLocale called with:', locale);
                set({ locale });
                const user = get().user;
                if (user) {
                    try {
                        console.log('Updating Supabase preferred_language for user:', user.id);
                        const { error } = await supabase
                            .from('users')
                            .update({ preferred_language: locale })
                            .eq('id', user.id);
                        if (error) {
                            console.error('Failed to update locale in Supabase:', error);
                        } else {
                            console.log('Successfully updated locale in Supabase');
                        }
                    } catch (e) {
                        console.error('Failed to sync locale to Supabase:', e);
                    }
                } else {
                    console.log('No user logged in, locale not synced to Supabase');
                }
            },

            // ----- User -----
            user: null,
            isAuthenticated: false,
            setUser: async (user) => {
                if (user) {
                    set({ user, isAuthenticated: true });
                    // Fetch language preference and chats asynchronously
                    try {
                        console.log('Supabase sync starting for user:', user.id);

                        // 1. Ensure user record exists in Supabase (Upsert)
                        const { data: upsertData, error: upsertErr } = await supabase
                            .from('users')
                            .upsert({
                                id: user.id,
                                email: user.email,
                                username: user.username
                            }, { onConflict: 'id' })
                            .select();

                        if (upsertErr) {
                            console.error('Supabase user upsert failed:', upsertErr);
                        } else {
                            console.log('Supabase user upsert success:', upsertData);
                        }

                        // 2. Fetch current settings and credits
                        const { data: userData, error: selectErr } = await supabase
                            .from('users')
                            .select('preferred_language, credits')
                            .eq('id', user.id)
                            .single();

                        if (selectErr && selectErr.code !== 'PGRST116') { // PGRST116 is 'no rows found'
                            console.error('Supabase select preferred_language failed:', selectErr);
                        }

                        if (userData?.preferred_language) {
                            console.log('Restored locale from Supabase:', userData.preferred_language);
                            set({ locale: userData.preferred_language as Locale });
                        }

                        // Credits are now handled by /api/auth/me synchronization
                        // so we don't need to double-fetch them here and cause a flash.

                        // 3. Load chats
                        const savedChats = await loadChatsFromSupabase(user.id);
                        console.log(`Restored ${savedChats.length} chats from Supabase`);
                        set({
                            chats: savedChats,
                            activeChatId: savedChats.length > 0 ? savedChats[0].id : null,
                        });
                    } catch (e) {
                        console.error('Failed to fetch user data from Supabase:', e);
                    }
                } else {
                    set({ user: null, isAuthenticated: false });
                }
            },
            logout: () => {
                const state = get();
                if (state.user?.id) {
                    saveChatsToSupabase(state.user.id, state.chats);
                }
                localStorage.removeItem('auth_token');
                set({
                    user: null,
                    isAuthenticated: false,
                    ageVerified: false,
                    chats: [],
                    activeChatId: null,
                });
            },

            // ----- Chats -----
            chats: [],
            activeChatId: null,
            get activeChat() {
                const state = get();
                return state.chats.find((c) => c.id === state.activeChatId) || null;
            },

            createChat: (name?: string) => {
                const id = uuidv4();
                const now = Date.now();
                const defaultName = name || `Chat ${get().chats.length + 1}`;
                const newChat: Chat = {
                    id,
                    name: defaultName,
                    messages: [],
                    createdAt: now,
                    updatedAt: now,
                };
                set((s) => ({
                    chats: [newChat, ...s.chats],
                    activeChatId: id,
                }));

                // Async sync
                const user = get().user;
                if (user) {
                    supabase.from('chats').insert({
                        id,
                        user_id: user.id,
                        name: defaultName,
                        created_at: new Date(now).toISOString(),
                        updated_at: new Date(now).toISOString()
                    }).then(({ error }) => {
                        if (error) console.error('Failed to sync new chat:', error);
                    });
                }
                return id;
            },

            renameChat: (id, name) => {
                set((s) => ({
                    chats: s.chats.map((c) => (c.id === id ? { ...c, name, updatedAt: Date.now() } : c)),
                }));

                const user = get().user;
                if (user) {
                    supabase.from('chats').update({ name, updated_at: new Date().toISOString() }).eq('id', id).then(({ error }) => {
                        if (error) console.error('Failed to sync rename:', error);
                    });
                }
            },

            deleteChat: (id) => {
                set((s) => {
                    const remaining = s.chats.filter((c) => c.id !== id);
                    return {
                        chats: remaining,
                        activeChatId: s.activeChatId === id ? (remaining[0]?.id || null) : s.activeChatId,
                    };
                });

                const user = get().user;
                if (user) {
                    supabase.from('chats').delete().eq('id', id).then(({ error }) => {
                        if (error) console.error('Failed to sync delete:', error);
                    });
                }
            },

            setActiveChat: (id) => set({ activeChatId: id }),

            // ----- Messages -----
            addMessage: (chatId, message) => {
                const id = uuidv4();
                const timestamp = Date.now();
                const fullMessage = { ...message, id, timestamp, isFavorite: message.isFavorite ?? false };

                set((s) => ({
                    chats: s.chats.map((c) =>
                        c.id === chatId
                            ? {
                                ...c,
                                messages: [...c.messages, fullMessage],
                                updatedAt: timestamp,
                            }
                            : c
                    ),
                }));

                const user = get().user;
                if (user) {
                    console.log('Syncing message to Supabase:', id, 'for chat:', chatId);
                    supabase.from('messages').insert({
                        id,
                        chat_id: chatId,
                        role: fullMessage.role,
                        content: fullMessage.content,
                        image_url: fullMessage.imageUrl,
                        video_url: fullMessage.videoUrl,
                        thumbnail_url: fullMessage.thumbnailUrl,
                        is_favorite: fullMessage.isFavorite,
                        created_at: new Date(timestamp).toISOString()
                    }).then(({ error }) => {
                        if (error) {
                            console.error('Failed to sync message to Supabase:', error);
                        } else {
                            console.log('Successfully synced message to Supabase');
                        }
                    });

                    // Update chat timestamp
                    supabase.from('chats').update({ updated_at: new Date(timestamp).toISOString() }).eq('id', chatId).then(({ error }) => {
                        if (error) console.error('Failed to sync chat timestamp:', error);
                    });
                }
            },

            toggleFavorite: (chatId, messageId) => {
                let currentStatus = false;
                set((s) => {
                    const chat = s.chats.find(c => c.id === chatId);
                    const msg = chat?.messages.find(m => m.id === messageId);
                    currentStatus = !msg?.isFavorite;

                    return {
                        chats: s.chats.map((c) =>
                            c.id === chatId
                                ? {
                                    ...c,
                                    messages: c.messages.map((m) =>
                                        m.id === messageId ? { ...m, isFavorite: currentStatus } : m
                                    ),
                                }
                                : c
                        ),
                    };
                });

                const user = get().user;
                if (user) {
                    supabase.from('messages').update({ is_favorite: currentStatus }).eq('id', messageId).then(({ error }) => {
                        if (error) console.error('Failed to sync favorite:', error);
                    });
                }
            },

            // ----- Generation Settings -----
            settings: DEFAULT_SETTINGS,
            updateSettings: (partial) =>
                set((s) => ({ settings: { ...s.settings, ...partial } })),
            setGenerationType: (type) =>
                set((s) => ({ settings: { ...s.settings, generationType: type } })),

            // ----- Filters -----
            mediaFilter: 'all',
            setMediaFilter: (filter) => set({ mediaFilter: filter }),

            // ----- Sidebar -----
            sidebarCollapsed: false,
            toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

            // ----- Settings Panel -----
            settingsPanelVisible: true,
            toggleSettingsPanel: () => set((s) => ({ settingsPanelVisible: !s.settingsPanelVisible })),
            setSettingsPanelVisible: (visible) => set({ settingsPanelVisible: visible }),

            // ----- Age Gate -----
            ageVerified: false,
            setAgeVerified: (verified) => set({ ageVerified: verified }),

            // ----- Generating -----
            isGenerating: false,
            setIsGenerating: (generating) => set({ isGenerating: generating }),

            // ----- Tag Settings -----
            tagSettings: DEFAULT_TAG_SETTINGS,
            updateTagSettings: (partial) =>
                set((s) => ({ tagSettings: { ...s.tagSettings, ...partial } })),
            toggleFetishTag: (tag) =>
                set((s) => ({
                    tagSettings: {
                        ...s.tagSettings,
                        fetish: s.tagSettings.fetish.includes(tag)
                            ? s.tagSettings.fetish.filter((t) => t !== tag)
                            : [...s.tagSettings.fetish, tag],
                    },
                })),
            resetTagSettings: () => set({ tagSettings: DEFAULT_TAG_SETTINGS }),

            // ----- Credits -----
            deductCredits: (amount: number) =>
                set((s) => ({
                    user: s.user ? { ...s.user, credits: Math.max(0, s.user.credits - amount) } : null,
                })),
            addCredits: (amount: number) =>
                set((s) => ({
                    user: s.user ? { ...s.user, credits: (s.user?.credits ?? 0) + amount } : null,
                })),
        }),
        {
            name: 'videogen-storage-v3', // Bumped version for auth system
            partialize: (state) => {
                // Strip large base64 data URIs and blob URLs from chat messages
                // before persisting to localStorage (they can be several MB each
                // and quickly exceed the ~5 MB localStorage quota).
                const isLargeUrl = (url?: string) =>
                    !!url && (url.startsWith('data:') || url.startsWith('blob:'));

                const sanitizedChats = state.chats.map((chat) => ({
                    ...chat,
                    messages: chat.messages.map((msg) => ({
                        ...msg,
                        imageUrl: isLargeUrl(msg.imageUrl) ? undefined : msg.imageUrl,
                        videoUrl: isLargeUrl(msg.videoUrl) ? undefined : msg.videoUrl,
                        thumbnailUrl: isLargeUrl(msg.thumbnailUrl) ? undefined : msg.thumbnailUrl,
                    })),
                }));

                return {
                    theme: state.theme,
                    locale: state.locale,
                    chats: sanitizedChats,
                    activeChatId: state.activeChatId,
                    user: state.user,
                    isAuthenticated: state.isAuthenticated,
                    settings: state.settings,
                    tagSettings: state.tagSettings,
                    ageVerified: state.ageVerified,
                    sidebarCollapsed: state.sidebarCollapsed,
                    settingsPanelVisible: state.settingsPanelVisible,
                };
            },
        }
    )
);
