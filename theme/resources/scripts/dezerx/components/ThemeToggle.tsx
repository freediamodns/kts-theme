import React, { useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/dezerx/components/ui';
import { usePanelTheme } from '@/dezerx/lib/panelTheme';
import { applyTheme, readStoredTheme, showTheme, useTheme } from '@/dezerx/lib/theme';
import { useT } from '@/i18n';

export default function ThemeToggle({ className }: { className?: string }) {
    const t = useT();
    const theme = useTheme();
    const pinned = usePanelTheme()['nav.colorMode'];
    const label = theme === 'dark' ? t('themeToggle.toLight') : t('themeToggle.toDark');

    useEffect(() => {
        showTheme(pinned === 'switch' ? readStoredTheme() ?? 'dark' : pinned);
    }, [pinned]);

    if (pinned !== 'switch') {
        return null;
    }

    return (
        <Button
            variant={'ghost'}
            onClick={() => applyTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={label}
            title={label}
            className={className}
            icon={theme === 'dark' ? <Sun className={'h-4 w-4'} /> : <Moon className={'h-4 w-4'} />}
        />
    );
}

export { ThemeToggle };
