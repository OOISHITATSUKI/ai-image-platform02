'use client';

import React, { useEffect, useState } from 'react';

interface Achievement {
  id: string;
  category: string;
  name: string;
  name_ja: string;
  description: string;
  description_ja: string;
  reward_credits: number;
  threshold: number;
  hint: string;
  unlocked: boolean;
  unlockedAt: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  all: 'All',
  generation: '🎨 Generation',
  exploration: '🔍 Exploration',
  collection: '📁 Collection',
  social: '👥 Social',
  chat: '💬 Chat',
  purchase: '💳 Purchase',
};

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [totalUnlocked, setTotalUnlocked] = useState(0);
  const [totalAchievements, setTotalAchievements] = useState(0);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAchievements();
  }, []);

  async function loadAchievements() {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const res = await fetch('/api/achievements/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setAchievements(data.achievements ?? []);
    setTotalUnlocked(data.totalUnlocked ?? 0);
    setTotalAchievements(data.totalAchievements ?? 0);
    setLoading(false);
  }

  const filtered = filter === 'all'
    ? achievements
    : achievements.filter(a => a.category === filter);

  if (loading) return <div className="achievements-page"><div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading...</div></div>;

  return (
    <div className="achievements-page">
      <div className="achievements-header">
        <h1>Achievements</h1>
        <div className="achievements-summary">
          <span className="achievements-count">{totalUnlocked}/{totalAchievements}</span>
          <span>unlocked</span>
        </div>
      </div>

      {/* Category filter */}
      <div className="achievements-filters">
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button
            key={key}
            className={`achievements-filter-btn ${filter === key ? 'active' : ''}`}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="achievements-grid">
        {filtered.map(a => (
          <div key={a.id} className={`achievement-card ${a.unlocked ? 'unlocked' : 'locked'}`}>
            <div className="achievement-icon">
              {a.unlocked ? '🏆' : '🔒'}
            </div>
            <div className="achievement-info">
              <h3 className="achievement-name">{a.name_ja || a.name}</h3>
              <p className="achievement-desc">
                {a.unlocked ? (a.description_ja || a.description) : (a.hint || '???')}
              </p>
              {a.unlocked && a.reward_credits > 0 && (
                <span className="achievement-reward">+{a.reward_credits} credits</span>
              )}
              {a.unlocked && a.unlockedAt && (
                <span className="achievement-date">
                  {new Date(a.unlockedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
