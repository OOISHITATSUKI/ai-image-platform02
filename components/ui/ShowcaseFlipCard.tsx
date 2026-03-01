'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

interface ShowcaseFlipCardProps {
    beforeSrc: string;
    afterSrc: string;
    imgAlt: string;
    autoFlip: boolean;
    priority?: boolean;
}

export default function ShowcaseFlipCard({ beforeSrc, afterSrc, imgAlt, autoFlip, priority = false }: ShowcaseFlipCardProps) {
    const [isFlipped, setIsFlipped] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!autoFlip) return;

        let intervalId: NodeJS.Timeout;

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (entry.isIntersecting) {
                    // Element is visible, start auto flipping every 3 seconds
                    intervalId = setInterval(() => {
                        setIsFlipped((prev) => !prev);
                    }, 3000);
                } else {
                    // Element is out of view, stop interval to save resources
                    if (intervalId) clearInterval(intervalId);
                    setIsFlipped(false); // Reset to front
                }
            },
            { threshold: 0.5 } // Trigger when at least 50% visible (adjust as needed)
        );

        if (cardRef.current) {
            observer.observe(cardRef.current);
        }

        return () => {
            observer.disconnect();
            if (intervalId) clearInterval(intervalId);
        };
    }, [autoFlip]);

    const handleManualFlip = () => {
        setIsFlipped((prev) => !prev);
    };

    return (
        <div
            className="showcase-card"
            ref={cardRef}
            onClick={handleManualFlip}
        >
            <div className={`showcase-inner ${isFlipped ? 'flipped' : ''}`}>
                <div className="showcase-front">
                    <Image
                        src={beforeSrc}
                        alt={`${imgAlt} Before`}
                        fill
                        style={{ objectFit: 'cover' }}
                        priority={priority}
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 300px"
                    />
                    <span className="flip-tag flip-tag-before">Before</span>
                </div>
                <div className="showcase-back">
                    <Image
                        src={afterSrc}
                        alt={`${imgAlt} After`}
                        fill
                        style={{ objectFit: 'cover' }}
                        loading={priority ? 'eager' : 'lazy'}
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 300px"
                    />
                    <span className="flip-tag flip-tag-after">After</span>
                </div>
            </div>
        </div>
    );
}
