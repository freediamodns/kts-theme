import React, { useEffect, useRef } from 'react';

const GLYPHS = '01{}[]()<>/\\|=+-*&^%$#@!?:;.,_~ABCDEFGHJKLMNPQRSTUVWXYZ';

const COLUMN_WIDTH = 18;

const TRAIL = 8;

const ROW_HEIGHT = 14;

const FRAME_MS = 42;

export function MatrixRain({ active = true }: { active?: boolean }) {
    const canvas = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const element = canvas.current;

        if (!element || !active) {
            return;
        }

        const context = element.getContext('2d');

        if (!context) {
            return;
        }

        const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        let accent = readAccent();
        let sinceRead = 0;

        const ratio = Math.min(window.devicePixelRatio || 1, 2);

        let columns: { y: number; speed: number; seed: number }[] = [];
        let width = 0;
        let height = 0;

        const measure = () => {
            const box = element.getBoundingClientRect();

            width = box.width;
            height = box.height;

            element.width = Math.floor(width * ratio);
            element.height = Math.floor(height * ratio);
            context.setTransform(ratio, 0, 0, ratio, 0, 0);
            context.font = '11px ui-monospace, monospace';
            context.textBaseline = 'top';

            const count = Math.max(1, Math.ceil(width / COLUMN_WIDTH));

            columns = Array.from({ length: count }, () => ({
                y: -Math.random() * height,
                speed: 0.5 + Math.random() * 1.1,
                seed: Math.floor(Math.random() * GLYPHS.length),
            }));
        };

        measure();

        const observer = new ResizeObserver(measure);

        observer.observe(element);

        let frame = 0;
        let last = 0;

        const draw = (at: number) => {
            frame = window.requestAnimationFrame(draw);

            const since = at - last;

            if (since < FRAME_MS) {
                return;
            }

            const delta = Math.min(since, 250) / 1000;

            last = at;

            if (++sinceRead > 40) {
                accent = readAccent();
                sinceRead = 0;
            }

            context.clearRect(0, 0, width, height);
            context.fillStyle = `rgb(${accent})`;

            for (let index = 0; index < columns.length; index++) {
                const column = columns[index];

                if (column === undefined) {
                    continue;
                }

                const x = index * COLUMN_WIDTH + 2;

                for (let step = 0; step < TRAIL; step++) {
                    const y = Math.floor(column.y) - step * ROW_HEIGHT;

                    if (y < -ROW_HEIGHT || y > height) {
                        continue;
                    }

                    const alpha = (1 - step / TRAIL) * 0.75;
                    const glyph = GLYPHS[(column.seed + step + Math.floor(column.y / ROW_HEIGHT)) % GLYPHS.length];

                    context.globalAlpha = step === 0 ? alpha : alpha * 0.6;
                    context.fillText(glyph ?? '0', x, y);
                }

                if (!still) {
                    column.y += column.speed * 57 * delta;
                }

                if (column.y - TRAIL * ROW_HEIGHT > height) {
                    column.y = -Math.random() * 60;
                    column.speed = 0.5 + Math.random() * 1.1;
                    column.seed = Math.floor(Math.random() * GLYPHS.length);
                }
            }

            context.globalAlpha = 1;
        };

        frame = window.requestAnimationFrame(draw);

        const onVisibility = () => {
            window.cancelAnimationFrame(frame);

            if (!document.hidden) {
                last = 0;
                frame = window.requestAnimationFrame(draw);
            }
        };

        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            window.cancelAnimationFrame(frame);
            document.removeEventListener('visibilitychange', onVisibility);
            observer.disconnect();
        };
    }, [active]);

    return (
        <canvas
            ref={canvas}
            aria-hidden={'true'}
            className={
                'pointer-events-none absolute inset-0 h-full w-full opacity-70 [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)]'
            }
        />
    );
}

function readAccent(): string {
    const value = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();

    const hex = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value);

    if (hex) {
        return [hex[1], hex[2], hex[3]].map((part) => parseInt(part ?? '0', 16)).join(', ');
    }

    const numbers = value.match(/\d+/g);

    return numbers && numbers.length >= 3 ? numbers.slice(0, 3).join(', ') : '120, 190, 255';
}

export default MatrixRain;
