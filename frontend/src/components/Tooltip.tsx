'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  position?: 'top' | 'bottom';
}

export function Tooltip({ content, children, className = '', position = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;

    if (position === 'top') {
      setCoords({ top: rect.top - 8, left: centerX });
    } else {
      setCoords({ top: rect.bottom + 8, left: centerX });
    }
  }, [position]);

  useEffect(() => {
    if (!isVisible) return;
    updatePosition();
  }, [isVisible, updatePosition]);

  // Adjust horizontal position to keep tooltip within viewport
  useEffect(() => {
    if (!isVisible || !tooltipRef.current) return;
    const el = tooltipRef.current;
    const rect = el.getBoundingClientRect();
    if (rect.left < 8) {
      el.style.transform = `translateX(${8 - rect.left}px)`;
    } else if (rect.right > window.innerWidth - 8) {
      el.style.transform = `translateX(${window.innerWidth - 8 - rect.right}px)`;
    }
  }, [isVisible, coords]);

  const arrowBorderStyles = position === 'top'
    ? { borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }
    : { borderLeft: '1px solid var(--border)', borderTop: '1px solid var(--border)' };

  return (
    <div
      ref={triggerRef}
      className={`relative flex items-center ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && createPortal(
        <div
          style={{
            position: 'fixed',
            top: position === 'top' ? coords.top : coords.top,
            left: coords.left,
            transform: position === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
            zIndex: 99999,
            pointerEvents: 'none',
          }}
        >
          <div
            ref={tooltipRef}
            className="w-max max-w-xs px-3 py-2 text-xs rounded shadow-lg whitespace-pre-wrap"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              textTransform: 'none',
            }}
          >
            {content}
            <div
              className="absolute h-2 w-2 rotate-45"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                ...arrowBorderStyles,
                left: '50%',
                marginLeft: '-4px',
                ...(position === 'top'
                  ? { bottom: '-5px' }
                  : { top: '-5px' }),
              }}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
