'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
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

function saveChatsForUser(userId: string, chats: Chat[]): void {
    try {
        // Strip large base64/blob URLs before saving to save space
        const cleaned = chats.map((chat) => ({
            ...chat,
            messages: chat.messages.map((msg) => ({
                ...msg,
                imageUrl: msg.imageUrl?.startsWith('data:') || msg.imageUrl?.startsWith('blob:')
                    ? undefined
                    : msg.imageUrl,
                videoUrl: msg.videoUrl?.startsWith('data:') || msg.videoUrl?.startsWith('blob:')
                    ? undefined
                    : msg.videoUrl,
            })),
        }));
        localStorage.setItem(`chats_${userId}`, JSON.stringify(cleaned));
    } catch (e) {
        console.error('Failed to save chats for user:', e);
    }
}

function loadChatsForUser(userId: string): Chat[] {
    try {
        const raw = localStorage.getItem(`chats_${userId}`);
        if (!raw) return [];
        return JSON.parse(raw) as Chat[];
    } catch {
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
    setLocale: (locale: Locale) => void;

    // ----- User -----
    user: User | null;
    isAuthenticated: boolean;
    setUser: (user: User | null) => void;
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
            setLocale: (locale) => set({ locale }),

            // ----- User -----
            user: null,
            isAuthenticated: false,
            setUser: (user) => {
                if (user) {
                    const savedChats = loadChatsForUser(user.id);
                    set({
                        user,
                        isAuthenticated: true,
                        chats: savedChats,
                        activeChatId: savedChats.length > 0 ? savedChats[0].id : null,
                    });
                } else {
                    set({ user: null, isAuthenticated: false });
                }
            },
            logout: () => {
                const state = get();
                if (state.user?.id) {
                    saveChatsForUser(state.user.id, state.chats);
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
                const newChat: Chat = {
                    id,
                    name: name || `Chat ${get().chats.length + 1}`,
                    messages: [],
                    createdAt: now,
                    updatedAt: now,
                };
                set((s) => ({
                    chats: [newChat, ...s.chats],
                    activeChatId: id,
                }));
                return id;
            },

            renameChat: (id, name) =>
                set((s) => ({
                    chats: s.chats.map((c) => (c.id === id ? { ...c, name, updatedAt: Date.now() } : c)),
                })),

            deleteChat: (id) =>
                set((s) => {
                    const remaining = s.chats.filter((c) => c.id !== id);
                    return {
                        chats: remaining,
                        activeChatId: s.activeChatId === id ? (remaining[0]?.id || null) : s.activeChatId,
                    };
                }),

            setActiveChat: (id) => set({ activeChatId: id }),

            // ----- Messages -----
            addMessage: (chatId, message) =>
                set((s) => ({
                    chats: s.chats.map((c) =>
                        c.id === chatId
                            ? {
                                ...c,
                                messages: [
                                    ...c.messages,
                                    { ...message, id: uuidv4(), timestamp: Date.now(), isFavorite: message.isFavorite ?? false },
                                ],
                                updatedAt: Date.now(),
                            }
                            : c
                    ),
                })),

            toggleFavorite: (chatId, messageId) =>
                set((s) => ({
                    chats: s.chats.map((c) =>
                        c.id === chatId
                            ? {
                                ...c,
                                messages: c.messages.map((m) =>
                                    m.id === messageId ? { ...m, isFavorite: !m.isFavorite } : m
                                ),
                            }
                            : c
                    ),
                })),

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
            deductCredits: (amount) =>
                set((s) => ({
                    user: s.user ? { ...s.user, credits: Math.max(0, s.user.credits - amount) } : null,
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
