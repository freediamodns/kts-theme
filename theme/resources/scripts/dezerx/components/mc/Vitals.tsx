import React from 'react';
import { ArmorRow, HeartRow, HungerRow, RowSpacer, XpBar } from '@/dezerx/components/mc/Hud';

export function Vitals({
    health,
    maxHealth,
    absorption,
    food,
    armorPoints,
    xpLevel,
    xpProgress,
    hardcore,
}: {
    health: number;
    maxHealth?: number;
    absorption?: number;
    food: number;
    armorPoints: number;
    xpLevel: number;
    xpProgress: number;
    hardcore?: boolean;
}) {
    const armoured = armorPoints > 0;

    return (
        <div className={'space-y-3 rounded-2xl bg-hud p-4'}>
            <div className={'flex items-center gap-4'}>
                <div className={'flex min-w-0 flex-1 flex-col items-start gap-1.5'}>
                    {armoured && <ArmorRow points={armorPoints} />}
                    <HeartRow health={health} maxHealth={maxHealth} absorption={absorption} hardcore={hardcore} />
                </div>

                <span
                    className={'mt-2 shrink-0 self-center font-minecraft text-[26px] leading-none text-[#7fff1f]'}
                    style={{
                        textShadow: '1px 0 0 #000, -1px 0 0 #000, 0 1px 0 #000, 0 -1px 0 #000, 2px 2px 0 #3f3f3f',
                    }}
                >
                    {xpLevel}
                </span>

                <div className={'flex min-w-0 flex-1 flex-col items-end gap-1.5'}>
                    {armoured && <RowSpacer />}
                    <HungerRow food={food} />
                </div>
            </div>

            <XpBar progress={xpProgress} />
        </div>
    );
}
