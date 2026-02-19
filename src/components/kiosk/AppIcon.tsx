import React from 'react';

type AppIconProps = {
    icon?: React.ReactNode | string;
    iconComponent?: React.ComponentType<any> | undefined;
    size?: number;
    className?: string;
    style?: React.CSSProperties;
};

export function AppIcon({ iconComponent, icon, size = 20, className, style }: AppIconProps) {
    const wrapperStyle: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        lineHeight: 1,
        overflow: 'hidden',
        ...style,
    };

    if (iconComponent) {
        const IconComp: any = iconComponent as any;
        return (
            <span className={className} style={wrapperStyle}>
                <IconComp style={{ width: '100%', height: '100%', display: 'block' }} />
            </span>
        );
    }

    return (
        <span
            className={className}
            style={{
                ...wrapperStyle,
                fontSize: size,
            }}
        >
            {icon}
        </span>
    );
}
