import { ComponentType } from 'react';
import { Boxes, CreditCard, Globe, LifeBuoy, Link2, MessageCircle, Plus, Server } from 'lucide-react';

export const NAV_ICONS: Record<string, ComponentType<{ className?: string }>> = {
    Boxes,
    CreditCard,
    Globe,
    LifeBuoy,
    Link2,
    MessageCircle,
    Plus,
    Server,
};

export function navIcon(name: string): ComponentType<{ className?: string }> {
    return NAV_ICONS[name] ?? Link2;
}

export interface QuickLinkConfig {
    label: string;
    blurb: string;
    to: string;
    icon: string;
    feature?: boolean;
    art?: 'globe' | 'outline' | 'none';
    enabled: boolean;
}

export const quickLinks: QuickLinkConfig[] = [
    {
        label: 'Discord',
        blurb: 'Get help and talk to the community.',
        to: 'https://discord.gg/',
        icon: 'MessageCircle',
        feature: true,
        art: 'globe',
        enabled: true,
    },
    {
        label: 'Billing',
        blurb: 'Invoices, plans and payment.',
        to: 'https://example.com/billing',
        icon: 'CreditCard',
        enabled: true,
    },
    {
        label: 'Website',
        blurb: 'Everything we host, and what it costs.',
        to: 'https://example.com',
        icon: 'Globe',
        enabled: true,
    },
    {
        label: 'Contact support',
        blurb: 'Open a ticket with a human.',
        to: 'https://example.com/support',
        icon: 'LifeBuoy',
        enabled: true,
    },
];

export const ipCountryEndpoint: string | null = 'https://api.country.is/{ip}';
