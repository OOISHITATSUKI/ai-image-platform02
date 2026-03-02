'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

interface ShowcaseFlipCardProps {
    beforeSrc: string;
    afterSrc: string;
    imgAlt: string;
    autoFlip: boolean;
    priority?: boolean;
    flipDelayMs?: number;
}

export default function ShowcaseFlipCard({ beforeSrc, afterSrc, imgAlt, autoFlip, priority = false, flipDelayMs = 0 }: ShowcaseFlipCardProps) {
    const [isFlipped, setIsFlipped] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!autoFlip) return;

        let intervalId: NodeJS.Timeout;
        let timeoutId: NodeJS.Timeout;

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (entry.isIntersecting) {
                    // Element is visible, wait for stagger delay then start interval
                    timeoutId = setTimeout(() => {
                        setIsFlipped(true); // Initial flip
                        intervalId = setInterval(() => {
                            setIsFlipped((prev) => !prev);
                        }, 3000);
                    }, flipDelayMs);
                } else {
                    // Element is out of view, stop interval to save resources
                    if (timeoutId) clearTimeout(timeoutId);
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
            if (timeoutId) clearTimeout(timeoutId);
            if (intervalId) clearInterval(intervalId);
        };
    }, [autoFlip, flipDelayMs]);

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
                <div className="showcase-front" style={{ transform: 'rotateY(0deg)' }}>
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
