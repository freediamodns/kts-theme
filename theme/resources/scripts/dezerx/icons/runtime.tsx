import React, { ComponentType, createContext, useContext, useEffect, useState } from 'react';
import { cn } from '@/dezerx/lib/cn';
import { STROKE_SETS, usePanelTheme, type IconSet } from '@/dezerx/lib/panelTheme';

export { STROKE_SETS };

export type Glyphs = Record<string, ComponentType<Record<string, unknown>>>;

const LOADERS: Record<Exclude<IconSet, 'lucide'>, () => Promise<{ default: Glyphs }>> = {
    tabler: () => import(/* webpackChunkName: "icons-tabler" */ './families/tabler'),
    phosphor: () => import(/* webpackChunkName: "icons-phosphor" */ './families/phosphor'),
    remix: () => import(/* webpackChunkName: "icons-remix" */ './families/remix'),
    hugeicons: () => import(/* webpackChunkName: "icons-hugeicons" */ './families/hugeicons'),
};

const loaded = new Map<IconSet, Glyphs>();

const pending = new Map<IconSet, Promise<Glyphs>>();

export function loadIconSet(id: IconSet): Promise<Glyphs> {
    if (id === 'lucide') {
        return Promise.resolve({});
    }

    const ready = loaded.get(id);

    if (ready) {
        return Promise.resolve(ready);
    }

    const existing = pending.get(id);

    if (existing) {
        return existing;
    }

    const run = LOADERS[id]()
        .then((module) => {
            loaded.set(id, module.default);
            pending.delete(id);

            return module.default;
        })
        .catch(() => {
            pending.delete(id);

            return {};
        });

    pending.set(id, run);

    return run;
}

const IconSetContext = createContext<Glyphs | null>(null);

export function IconSetProvider({ children }: { children: React.ReactNode }) {
    const id = usePanelTheme()['icons.set'];
    const [glyphs, setGlyphs] = useState<Glyphs | null>(() => loaded.get(id) ?? null);

    useEffect(() => {
        if (id === 'lucide') {
            setGlyphs(null);

            return;
        }

        let live = true;

        void loadIconSet(id).then((next) => {
            if (live) {
                setGlyphs(next);
            }
        });

        return () => {
            live = false;
        };
    }, [id]);

    return <IconSetContext.Provider value={id === 'lucide' ? null : glyphs}>{children}</IconSetContext.Provider>;
}

export function useIconSet(id: IconSet): Glyphs | null {
    const [glyphs, setGlyphs] = useState<Glyphs | null>(() => loaded.get(id) ?? null);

    useEffect(() => {
        if (id === 'lucide') {
            setGlyphs(null);

            return;
        }

        let live = true;

        void loadIconSet(id).then((next) => live && setGlyphs(next));

        return () => {
            live = false;
        };
    }, [id]);

    return id === 'lucide' ? null : glyphs;
}

interface IconProps {
    className?: string;
    size?: string | number;
    [key: string]: unknown;
}

export function themed(name: string, Fallback: ComponentType<IconProps>): ComponentType<IconProps> {
    function Themed(props: IconProps) {
        const glyphs = useContext(IconSetContext);
        const Glyph = glyphs?.[name];
        const className = cn('dz-icon', props.className);

        if (!Glyph) {
            return <Fallback {...props} className={className} />;
        }

        return <Glyph {...props} className={className} size={props.size ?? 24} />;
    }

    Themed.displayName = name;

    return Themed;
}
