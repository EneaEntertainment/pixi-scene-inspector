import { isolateEditableKeyEvents } from '../../editable-keys';
import { exportPropsForSection, PROPERTY_SECTION_IDS, PROPERTY_SECTION_TITLES } from '../properties/catalog';
import { closeIconSvg } from '../shell/panel-icons';
import {
    readPropertyExportOutput,
    readPropertyExportSelection,
    writePropertyExportOutput,
    writePropertyExportSelection,
} from '../shell/settings';
import {
    availableExportPropsForNode,
    availableExportPropsForSection,
    buildNodeExportPayload,
    buildSectionExportPayload,
    copyExportPayload,
    downloadExportPayload,
} from './payload';

import type { ExportPropSpec } from '../properties/catalog';
import type { PropertyExportOutputMode, PropertyExportSectionId, PropertyExportSelection } from '../shell/settings';
import type { ExportPropertyMaps } from './payload';

type ExportPropId = string;

function defaultSelection(sectionId: PropertyExportSectionId, specs: Array<ExportPropSpec>): PropertyExportSelection
{
    const saved = readPropertyExportSelection(sectionId);
    const selection: PropertyExportSelection = {};

    for (const spec of specs)
    {
        selection[spec.id] = saved[spec.id] !== false;
    }

    return selection;
}

type ExportDialogOptions = {
    title: string;
    fileBaseName: string;
    getMaps: () => ExportPropertyMaps;
} & (
    | {
        kind: 'section';
        sectionId: PropertyExportSectionId;
    }
    | {
        kind: 'node';
    }
);

export type ExportDialog = {
    close: () => void;
};

export function openExportDialog(options: ExportDialogOptions): ExportDialog
{
    const maps = options.getMaps();
    const availableSections: Array<{
        id: PropertyExportSectionId;
        title: string;
        specs: Array<ExportPropSpec>;
    }> = [];

    if (options.kind === 'section')
    {
        availableSections.push({
            id    : options.sectionId,
            title : options.title,
            specs : availableExportPropsForSection(options.sectionId, maps),
        });
    }
    else
    {
        for (const sectionId of PROPERTY_SECTION_IDS)
        {
            const specs = availableExportPropsForSection(sectionId, maps);

            if (specs.length === 0)
            {
                continue;
            }

            availableSections.push({
                id    : sectionId,
                title : PROPERTY_SECTION_TITLES[sectionId],
                specs,
            });
        }
    }

    const selections: Partial< Record<PropertyExportSectionId, PropertyExportSelection> > = {};

    for (const section of availableSections)
    {
        selections[section.id] = defaultSelection(section.id, exportPropsForSection(section.id));
    }

    const overlay = document.createElement('div');
    const isNodeExport = options.kind === 'node';

    Object.assign(overlay.style, {
        position       : 'fixed',
        inset          : '0',
        zIndex         : '2147483647',
        display        : 'flex',
        alignItems     : 'center',
        justifyContent : 'center',
        padding        : '12px',
        boxSizing      : 'border-box',
        background     : 'rgba(0, 0, 0, 0.45)',
        fontFamily     : 'ui-sans-serif, system-ui, sans-serif',
    });

    const dialog = document.createElement('div');

    Object.assign(dialog.style, {
        width    : '100%',
        maxWidth : isNodeExport
            ? `${Math.max(240, availableSections.length * 168)}px`
            : '240px',
        maxHeight     : '100%',
        display       : 'flex',
        flexDirection : 'column',
        gap           : '10px',
        padding       : '12px',
        borderRadius  : '6px',
        background    : '#2f2f2f',
        border        : '1px solid #555',
        boxShadow     : '0 8px 24px rgba(0, 0, 0, 0.45)',
        color         : '#e5e5e5',
        fontSize      : '12px',
        boxSizing     : 'border-box',
        overflow      : 'hidden',
    });

    const header = document.createElement('div');

    Object.assign(header.style, {
        display    : 'flex',
        alignItems : 'center',
        gap        : '8px',
        minWidth   : '0',
    });

    const heading = document.createElement('div');

    heading.textContent = `Export ${options.title}`;

    Object.assign(heading.style, {
        flex          : '1',
        minWidth      : '0',
        fontWeight    : '700',
        fontSize      : '12px',
        letterSpacing : '0.02em',
        overflow      : 'hidden',
        textOverflow  : 'ellipsis',
        whiteSpace    : 'nowrap',
    });

    const closeBtn = document.createElement('button');

    closeBtn.title = 'Close';
    closeBtn.type = 'button';
    closeBtn.innerHTML = closeIconSvg();

    closeBtn.setAttribute('aria-label', 'Close');

    Object.assign(closeBtn.style, {
        flexShrink     : '0',
        display        : 'flex',
        alignItems     : 'center',
        justifyContent : 'center',
        width          : '20px',
        height         : '20px',
        margin         : '0',
        padding        : '0',
        border         : '0',
        borderRadius   : '3px',
        appearance     : 'none',
        background     : 'transparent',
        color          : '#bdbdbd',
        cursor         : 'pointer',
        boxSizing      : 'border-box',
    });

    closeBtn.addEventListener('pointerenter', () =>
    {
        closeBtn.style.color = '#fff';
        closeBtn.style.background = '#545454';
    });

    closeBtn.addEventListener('pointerleave', () =>
    {
        closeBtn.style.color = '#bdbdbd';
        closeBtn.style.background = 'transparent';
    });

    closeBtn.addEventListener('click', (event) =>
    {
        event.preventDefault();
        event.stopPropagation();
        close();
    });

    header.appendChild(heading);
    header.appendChild(closeBtn);

    const list = document.createElement('div');

    Object.assign(list.style, {
        display       : 'flex',
        flexDirection : isNodeExport ? 'row' : 'column',
        alignItems    : 'stretch',
        gap           : isNodeExport ? '0' : '4px',
        overflowX     : isNodeExport ? 'auto' : 'hidden',
        overflowY     : 'auto',
        minHeight     : '0',
        flex          : '1',
    });

    const checkboxes = new Map<ExportPropId, HTMLInputElement>();

    function appendPropRow(parent: HTMLElement, sectionId: PropertyExportSectionId, spec: ExportPropSpec)
    {
        const selection = selections[sectionId] ?? {};
        const row = document.createElement('label');

        Object.assign(row.style, {
            display    : 'flex',
            alignItems : 'center',
            gap        : '8px',
            minHeight  : '22px',
            cursor     : 'pointer',
            userSelect : 'none',
        });

        const checkbox = document.createElement('input');

        checkbox.type = 'checkbox';
        checkbox.checked = selection[spec.id] !== false;

        Object.assign(checkbox.style, {
            width       : '14px',
            height      : '14px',
            margin      : '0',
            accentColor : '#4772b3',
            cursor      : 'pointer',
            flexShrink  : '0',
        });

        const label = document.createElement('span');

        label.textContent = spec.id;

        Object.assign(label.style, {
            fontSize     : '12px',
            color        : '#e5e5e5',
            minWidth     : '0',
            overflow     : 'hidden',
            textOverflow : 'ellipsis',
            whiteSpace   : 'nowrap',
        });

        checkbox.addEventListener('change', () =>
        {
            selection[spec.id] = checkbox.checked;
            selections[sectionId] = selection;
            writePropertyExportSelection(sectionId, { ...selection });
        });

        checkboxes.set(spec.id, checkbox);
        row.appendChild(checkbox);
        row.appendChild(label);
        parent.appendChild(row);
    }

    if (isNodeExport)
    {
        availableSections.forEach((section, index) =>
        {
            if (index > 0)
            {
                const divider = document.createElement('div');

                Object.assign(divider.style, {
                    flexShrink : '0',
                    width      : '1px',
                    alignSelf  : 'stretch',
                    background : '#555',
                    margin     : '0 10px',
                });

                list.appendChild(divider);
            }

            const column = document.createElement('div');

            Object.assign(column.style, {
                flex          : '1 1 0',
                minWidth      : '140px',
                display       : 'flex',
                flexDirection : 'column',
                gap           : '4px',
            });

            const sectionTitle = document.createElement('div');

            sectionTitle.textContent = section.title;

            Object.assign(sectionTitle.style, {
                fontWeight    : '700',
                fontSize      : '11px',
                letterSpacing : '0.02em',
                color         : '#bdbdbd',
                textTransform : 'uppercase',
                padding       : '0 0 2px',
                overflow      : 'hidden',
                textOverflow  : 'ellipsis',
                whiteSpace    : 'nowrap',
            });

            column.appendChild(sectionTitle);

            for (const spec of section.specs)
            {
                appendPropRow(column, section.id, spec);
            }

            list.appendChild(column);
        });
    }
    else
    {
        for (const section of availableSections)
        {
            for (const spec of section.specs)
            {
                appendPropRow(list, section.id, spec);
            }
        }
    }

    const actions = document.createElement('div');

    Object.assign(actions.style, {
        display       : 'flex',
        flexDirection : 'column',
        gap           : '6px',
    });

    let outputMode: PropertyExportOutputMode = readPropertyExportOutput();

    const modeToggle = document.createElement('div');

    Object.assign(modeToggle.style, {
        display      : 'flex',
        width        : '100%',
        border       : '1px solid #555',
        borderRadius : '4px',
        overflow     : 'hidden',
        boxSizing    : 'border-box',
    });

    function makeModeButton(label: string, mode: PropertyExportOutputMode): HTMLButtonElement
    {
        const button = document.createElement('button');

        button.type = 'button';
        button.textContent = label;

        Object.assign(button.style, {
            flex         : '1',
            height       : '26px',
            margin       : '0',
            padding      : '0 6px',
            border       : '0',
            borderRadius : '0',
            appearance   : 'none',
            background   : '#3a3a3a',
            color        : '#bdbdbd',
            font         : 'inherit',
            fontSize     : '11px',
            fontWeight   : '600',
            cursor       : 'pointer',
            boxSizing    : 'border-box',
            whiteSpace   : 'nowrap',
        });

        button.addEventListener('click', (event) =>
        {
            event.preventDefault();
            event.stopPropagation();
            setOutputMode(mode);
        });

        return button;
    }

    const jsonModeBtn = makeModeButton('Export to JSON', 'json');
    const clipboardModeBtn = makeModeButton('Copy to clipboard', 'clipboard');

    modeToggle.appendChild(jsonModeBtn);
    modeToggle.appendChild(clipboardModeBtn);

    function makeActionButton(label: string, background: string): HTMLButtonElement
    {
        const button = document.createElement('button');

        button.type = 'button';
        button.textContent = label;

        Object.assign(button.style, {
            width        : '100%',
            height       : '26px',
            margin       : '0',
            padding      : '0 8px',
            border       : '0',
            borderRadius : '4px',
            appearance   : 'none',
            background,
            color        : '#fff',
            font         : 'inherit',
            fontSize     : '12px',
            fontWeight   : '600',
            cursor       : 'pointer',
            boxSizing    : 'border-box',
        });

        return button;
    }

    const exportSelectedBtn = makeActionButton('Export selected', '#4772b3');
    const exportAllBtn = makeActionButton('Export all', '#47b374');

    function syncModeToggle()
    {
        const jsonActive = outputMode === 'json';

        jsonModeBtn.style.background = jsonActive ? '#4772b3' : '#3a3a3a';
        jsonModeBtn.style.color = jsonActive ? '#fff' : '#bdbdbd';
        clipboardModeBtn.style.background = jsonActive ? '#3a3a3a' : '#4772b3';
        clipboardModeBtn.style.color = jsonActive ? '#bdbdbd' : '#fff';
        exportSelectedBtn.textContent = jsonActive
            ? 'Export selected'
            : 'Copy selected';
        exportAllBtn.textContent = jsonActive ? 'Export all' : 'Copy all';
    }

    function setOutputMode(mode: PropertyExportOutputMode)
    {
        outputMode = mode;

        writePropertyExportOutput(mode);
        syncModeToggle();
    }

    syncModeToggle();

    async function runExport(mode: 'selected' | 'all')
    {
        const currentMaps = options.getMaps();

        const available = options.kind === 'section'
            ? availableExportPropsForSection(options.sectionId, currentMaps)
            : availableExportPropsForNode(currentMaps);

        const ids: ReadonlySet<ExportPropId> | 'all' = mode === 'all'
            ? 'all'
            : new Set(
                available
                    .filter((spec) => checkboxes.get(spec.id)?.checked)
                    .map((spec) => spec.id),
            );

        const payload = options.kind === 'section'
            ? buildSectionExportPayload(currentMaps, options.sectionId, ids)
            : buildNodeExportPayload(currentMaps, ids);

        if (outputMode === 'json')
        {
            downloadExportPayload(payload, options.fileBaseName);
        }
        else
        {
            await copyExportPayload(payload);
        }

        close();
    }

    exportSelectedBtn.addEventListener('click', () =>
    {
        void runExport('selected');
    });

    exportAllBtn.addEventListener('click', () =>
    {
        void runExport('all');
    });

    actions.appendChild(modeToggle);
    actions.appendChild(exportSelectedBtn);
    actions.appendChild(exportAllBtn);
    dialog.appendChild(header);
    dialog.appendChild(list);
    dialog.appendChild(actions);
    overlay.appendChild(dialog);

    const onOverlayPointerDown = (event: PointerEvent) =>
    {
        if (event.target !== overlay)
        {
            return;
        }

        event.preventDefault();
        close();
    };

    const onKeyDown = (event: KeyboardEvent) =>
    {
        if (event.key !== 'Escape')
        {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        close();
    };

    let closed = false;
    let stopEditableKeys: (() => void) | null = null;

    function close()
    {
        if (closed)
        {
            return;
        }

        closed = true;

        stopEditableKeys?.();
        stopEditableKeys = null;

        overlay.removeEventListener('pointerdown', onOverlayPointerDown);
        window.removeEventListener('keydown', onKeyDown, true);
        overlay.remove();
    }

    overlay.addEventListener('pointerdown', onOverlayPointerDown);
    window.addEventListener('keydown', onKeyDown, true);
    document.body.appendChild(overlay);

    stopEditableKeys = isolateEditableKeyEvents(overlay);

    return { close };
}
