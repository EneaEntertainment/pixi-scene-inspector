import { Container, Text } from 'pixi.js';

export const DEMO_SAFE_WIDTH = 1024;
export const DEMO_SAFE_HEIGHT = 768;

export function labeledSection(label: string): Container
{
    const root = new Container();

    root.label = label;

    const title = new Text({
        text  : label,
        style : { fill: 0xcbd5e1, fontSize: 14, fontFamily: 'ui-monospace, monospace' },
    });

    title.label = `${label}Title`;
    title.position.set(0, -20);

    root.addChild(title);

    return root;
}
