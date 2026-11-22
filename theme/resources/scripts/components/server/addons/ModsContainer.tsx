import React from 'react';
import AddonContainer from '@/components/server/addons/AddonContainer';

export default function ModsContainer() {
    return <AddonContainer kind={'mods'} title={'Mods'} directory={'/mods'} />;
}
