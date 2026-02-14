'use client';

import React from 'react';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/useTranslation';
import SettingsPanel from '@/components/editor/SettingsPanel';
import Img2VidPanel from '@/components/editor/Img2VidPanel';
import ChatArea from '@/components/editor/ChatArea';

export default function EditorPage() {
    const { settings } = useAppStore();
    const isImg2Vid = settings.generationType === 'img2vid';

    return (
        <div className="editor-layout">
            {isImg2Vid ? <Img2VidPanel /> : <SettingsPanel />}
            <ChatArea />
        </div>
    );
}
