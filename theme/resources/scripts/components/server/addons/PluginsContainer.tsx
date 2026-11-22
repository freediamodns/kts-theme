import React from 'react';
import AddonContainer from '@/components/server/addons/AddonContainer';

export default function PluginsContainer() {
    return <AddonContainer kind={'plugins'} title={'Plugins'} directory={'/plugins'} />;
}
