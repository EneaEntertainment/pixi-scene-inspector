import { createTexturePickerThumb } from './grid';
import {
    buildPathTree,
    createEmptyPathTree,
    folderNames,
    nodeAtPath,
    pathSegments,
    pathToEntry,
} from './path-tree';

import type { CachedTextureEntry } from '../../../page-ops/texture';
import type { TexturePickerLazyThumbs } from './lazy';
import type { PathTreeNode } from './path-tree';

const LIST_COLUMN_MIN = 220;

export type TexturePickerColumns = {
    setEntries: (entries: Array<CachedTextureEntry>) => void;
    setCurrentName: (name: string | undefined) => void;
    render: () => void;
    clear: () => void;
    dispose: () => void;
};

function styleRow(selected: boolean): Partial<CSSStyleDeclaration>
{
    return {
        display      : 'flex',
        alignItems   : 'center',
        gap          : '6px',
        width        : '100%',
        minWidth     : '0',
        minHeight    : 'max-content',
        margin       : '0',
        padding      : '4px 6px',
        border       : selected ? '1px solid #4772b3' : '1px solid transparent',
        borderRadius : '4px',
        appearance   : 'none',
        background   : selected ? '#3a4a63' : 'transparent',
        color        : '#e5e5e5',
        cursor       : 'pointer',
        boxSizing    : 'border-box',
        textAlign    : 'left',
        font         : 'inherit',
        fontSize     : '12px',
    };
}

function bindHover(button: HTMLButtonElement, selected: boolean)
{
    button.addEventListener('pointerenter', () =>
    {
        if (selected)
        {
            return;
        }

        button.style.background = '#484848';
    });

    button.addEventListener('pointerleave', () =>
    {
        button.style.background = selected ? '#3a4a63' : 'transparent';
    });
}

export function createTexturePickerColumns(
    host: HTMLElement,
    lazyThumbs: TexturePickerLazyThumbs,
    onSelect: (name: string) => void,
): TexturePickerColumns
{
    let tree: PathTreeNode = createEmptyPathTree();
    let currentName: string | undefined;
    let selectedPath: Array<string> = [];
    let disposed = false;

    function syncPathToCurrent()
    {
        if (!currentName)
        {
            selectedPath = [];

            return;
        }

        const nextPath = pathToEntry(currentName);
        let node = tree;

        selectedPath = [];

        for (const segment of nextPath)
        {
            if (!node.folders.has(segment))
            {
                break;
            }

            selectedPath.push(segment);

            node = node.folders.get(segment) ?? node;
        }
    }

    function openFolder(path: Array<string>)
    {
        selectedPath = path;

        render();
    }

    function render()
    {
        if (disposed)
        {
            return;
        }

        lazyThumbs.clear();
        host.replaceChildren();

        Object.assign(host.style, {
            display             : 'flex',
            flexDirection       : 'row',
            alignItems          : 'stretch',
            gridTemplateColumns : 'none',
            gridAutoRows        : 'auto',
            gap                 : '0',
            overflowX           : 'auto',
            overflowY           : 'hidden',
            overscrollBehavior  : 'contain',
            touchAction         : 'pan-x pan-y',
        });

        const columnCount = selectedPath.length + 1;

        for (let columnIndex = 0; columnIndex < columnCount; columnIndex++)
        {
            if (columnIndex > 0)
            {
                const divider = document.createElement('div');

                Object.assign(divider.style, {
                    flexShrink : '0',
                    width      : '1px',
                    alignSelf  : 'stretch',
                    background : '#555',
                });

                host.appendChild(divider);
            }

            const pathPrefix = selectedPath.slice(0, columnIndex);
            const node = nodeAtPath(tree, pathPrefix);
            const column = document.createElement('div');

            column.dataset.texturePickerColumn = '1';

            Object.assign(column.style, {
                flex               : `1 1 ${LIST_COLUMN_MIN}px`,
                minWidth           : `${LIST_COLUMN_MIN}px`,
                display            : 'flex',
                flexDirection      : 'column',
                gap                : '2px',
                minHeight          : '0',
                height             : '100%',
                overflowX          : 'hidden',
                overflowY          : 'auto',
                overscrollBehavior : 'contain',
                padding            : '2px',
                boxSizing          : 'border-box',
            });

            if (!node)
            {
                host.appendChild(column);

                continue;
            }

            const selectedFolder = selectedPath[columnIndex];

            for (const folder of folderNames(node))
            {
                const selected = folder === selectedFolder;
                const button = document.createElement('button');

                button.type = 'button';
                button.title = [...pathPrefix, folder].join('/');

                button.setAttribute('aria-label', `Folder ${folder}`);
                Object.assign(button.style, styleRow(selected));

                const label = document.createElement('span');

                label.textContent = folder;

                Object.assign(label.style, {
                    flex          : '1',
                    minWidth      : '0',
                    overflow      : 'hidden',
                    textOverflow  : 'ellipsis',
                    whiteSpace    : 'nowrap',
                    pointerEvents : 'none',
                    fontWeight    : selected ? '600' : '400',
                });

                const chevron = document.createElement('span');

                chevron.textContent = '›';

                Object.assign(chevron.style, {
                    flexShrink    : '0',
                    color         : '#8a8a8a',
                    pointerEvents : 'none',
                });

                bindHover(button, selected);
                button.append(label, chevron);

                const nextPath = [...pathPrefix, folder];

                button.addEventListener('click', (event) =>
                {
                    event.preventDefault();
                    event.stopPropagation();
                    openFolder(nextPath);
                });

                column.appendChild(button);
            }

            for (const entry of node.files)
            {
                const selected = entry.name === currentName;
                const button = document.createElement('button');
                const segments = pathSegments(entry.name);
                const labelText = segments[segments.length - 1] ?? entry.name;

                button.type = 'button';
                button.title = entry.name;

                button.setAttribute('aria-label', entry.name);
                Object.assign(button.style, styleRow(selected));

                const label = document.createElement('span');

                label.textContent = labelText;

                Object.assign(label.style, {
                    flex          : '1',
                    minWidth      : '0',
                    overflow      : 'hidden',
                    textOverflow  : 'ellipsis',
                    whiteSpace    : 'nowrap',
                    pointerEvents : 'none',
                });

                bindHover(button, selected);
                button.append(createTexturePickerThumb(entry, 28, lazyThumbs), label);

                button.addEventListener('click', (event) =>
                {
                    event.preventDefault();
                    event.stopPropagation();
                    onSelect(entry.name);
                });

                column.appendChild(button);
            }

            host.appendChild(column);
        }

        const lastColumn = host.lastElementChild;

        if (lastColumn instanceof HTMLElement)
        {
            lastColumn.scrollIntoView({ inline: 'nearest', block: 'nearest' });
        }
    }

    return {
        setEntries(entries)
        {
            tree = buildPathTree(entries);

            syncPathToCurrent();
        },

        setCurrentName(name)
        {
            currentName = name;

            syncPathToCurrent();
        },

        render,

        clear()
        {
            host.replaceChildren();
        },

        dispose()
        {
            disposed = true;

            host.replaceChildren();
        },
    };
}
