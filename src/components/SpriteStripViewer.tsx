"use client";

import React, { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";

interface SimpleSpriteStripViewerProps {
    spriteStripUrl: string;
    frameCount?: number;
    hover?: boolean;
    ratio?: '16:9' | '4:3' | '1:1' | 'auto';
    className?: string;
    showControls?: boolean;
    autoPlay?: boolean;
    onFrameChange?: (frame: number) => void;
    onPlayPause?: (playing: boolean) => void;
    customPlayButton?: React.ReactNode;
    customPauseButton?: React.ReactNode;
}

const SimpleSpriteStripViewer: React.FC<SimpleSpriteStripViewerProps> = ({
    spriteStripUrl,
    frameCount = 18,
    hover = true,
    ratio = '16:9',
    className = "",
    showControls = true,
    autoPlay = false,
    onFrameChange,
    onPlayPause,
    customPlayButton,
    customPauseButton,
}) => {
    const [currentFrame, setCurrentFrame] = useState(0);
    const [isPlaying, setIsPlaying] = useState(autoPlay);
    const [imageError, setImageError] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Reset state when URL changes
    useEffect(() => {
        if (spriteStripUrl) {
            setImageError(false);
            setCurrentFrame(0);
        }
    }, [spriteStripUrl]);

    // Animation loop
    useEffect(() => {
        if (isPlaying) {
            const interval = setInterval(() => {
                setCurrentFrame((prev) => {
                    const nextFrame = (prev + 1) % frameCount;
                    onFrameChange?.(nextFrame);
                    return nextFrame;
                });
            }, 200);

            return () => clearInterval(interval);
        }
        return undefined;
    }, [isPlaying, frameCount, onFrameChange]);

    // Handle play/pause
    const handlePlayPause = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const newPlayingState = !isPlaying;
        setIsPlaying(newPlayingState);
        onPlayPause?.(newPlayingState);
    };

    // Handle mouse hover for frame animation
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!hover || !isHovering || !containerRef.current) return;

        // Check if the mouse is over the play button area
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('[role="button"]')) {
            return; // Don't interfere with button interactions
        }

        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;

        // Ensure we're within bounds and calculate percentage
        const clampedX = Math.max(0, Math.min(x, rect.width));
        const percentage = clampedX / rect.width;

        // Calculate frame with proper bounds checking
        const frame = Math.floor(percentage * frameCount);
        const clampedFrame = Math.max(0, Math.min(frame, frameCount - 1));

        setCurrentFrame(clampedFrame);
        onFrameChange?.(clampedFrame);
    };

    // Handle touch events for mobile
    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        if (!hover || !isHovering || !containerRef.current) return;

        // Check if the touch is over the play button area
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('[role="button"]')) {
            return; // Don't interfere with button interactions
        }

        e.preventDefault(); // Prevent scrolling
        const rect = containerRef.current.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;

        // Ensure we're within bounds and calculate percentage
        const clampedX = Math.max(0, Math.min(x, rect.width));
        const percentage = clampedX / rect.width;

        // Calculate frame with proper bounds checking
        const frame = Math.floor(percentage * frameCount);
        const clampedFrame = Math.max(0, Math.min(frame, frameCount - 1));

        setCurrentFrame(clampedFrame);
        onFrameChange?.(clampedFrame);
    };

    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        if (hover) {
            setIsHovering(true);
            if (isPlaying) {
                setIsPlaying(false);
                onPlayPause?.(false);
            }
            // Handle the initial touch position
            handleTouchMove(e);
        }
    };

    const handleTouchEnd = () => {
        if (hover) {
            setIsHovering(false);
            setCurrentFrame(0);
            onFrameChange?.(0);
        }
    };

    const handleMouseEnter = () => {
        if (hover) {
            setIsHovering(true);
            if (isPlaying) {
                setIsPlaying(false);
                onPlayPause?.(false);
            }
        }
    };

    const handleMouseLeave = () => {
        if (hover) {
            setIsHovering(false);
            setCurrentFrame(0);
            onFrameChange?.(0);
        }
    };

    // Get aspect ratio class
    const getAspectRatioClass = (): string => {
        switch (ratio) {
            case '16:9':
                return 'aspect-video';
            case '4:3':
                return 'aspect-[4/3]';
            case '1:1':
                return 'aspect-square';
            case 'auto':
                return '';
            default:
                return '';
        }
    };

    return (
        <div
            ref={containerRef}
            className={`relative overflow-hidden ${getAspectRatioClass()} ${className}`}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Sprite Strip Display */}
            <div
                className="h-full w-full bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage: `url(${spriteStripUrl})`,
                    backgroundPosition: `${(currentFrame / (frameCount - 1)) * 100}% 0%`,
                    backgroundSize: `${frameCount * 100}% 100%`,
                    imageRendering: 'pixelated', // Ensure crisp sprite rendering
                }}
                onError={() => {
                    console.error("❌ Image failed to load");
                    setImageError(true);
                }}
            />

            {/* Error State */}
            {imageError && (
                <div className="absolute inset-0 flex h-full w-full items-center justify-center bg-gray-100">
                    <div className="flex flex-col items-center gap-2 text-center">
                        <div className="text-sm text-gray-600">Image not available</div>
                        <div className="text-xs text-gray-500">Check the image URL</div>
                    </div>
                </div>
            )}

            {/* Play/Pause Button */}
            {/* {showControls && !imageError && (
                <div className="pointer-events-auto absolute right-2 bottom-2 z-50">
                    {customPlayButton || customPauseButton ? (
                        <div onClick={handlePlayPause}>
                            {isPlaying ? customPauseButton : customPlayButton}
                        </div>
                    ) : (
                        <button
                            onClick={handlePlayPause}
                            className="h-8 w-8 border border-white bg-white text-black shadow-lg hover:bg-gray-100 active:bg-gray-200 rounded flex items-center justify-center cursor-pointer select-none"
                            title={isPlaying ? "Pause" : "Play"}
                            type="button"
                        >
                            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                        </button>
                    )}
                </div>
            )} */}
        </div>
    );
};

export default SimpleSpriteStripViewer;
