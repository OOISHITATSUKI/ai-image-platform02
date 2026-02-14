'use client';

import React from 'react';

export default function LibraryPage() {
    return (
        <div className="library-view">
            <div className="library-header">
                <h1>Library</h1>
            </div>
            <div className="gallery-grid">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="gallery-item">
                        <div className="gallery-placeholder">
                            {i % 2 === 0 ? '🎬' : '🖼️'}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
