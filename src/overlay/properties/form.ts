import { isNodeAlive } from '../../page-ops/pixi-node';
import { resolveAliveNodesByIds } from '../../page-ops/resolve-selection';
import { clearSelectionIds } from '../../page-ops/selection-ids';
import { typeNameOf } from '../../page-ops/types';
import { openExportDialog } from '../export';
import { OBJECT_FORM_SECTIONS, TEXT_FORM_SECTIONS } from './catalog';
import {
    createBooleanField,
    createColorField,
    createFillStopsField,
    createNumberField,
    createSection,
    createSelectField,
    createTextField,
} from './fields';
import { isTextNumberKey, resolveBooleanMap, resolveNumberMap, resolveStringMap } from './keys';
import { mapsForNode } from './node';
import { createPropertiesTabs } from './tabs';
import { textMapsForNode } from './text';
import { applyTransformNumber, MULTI_TRANSFORM_KEYS } from './transform-apply';

import type { PageGlobals, PixiNode } from '../../page-ops/pixi-node';
import type { SelectionChannel } from '../../selection-channel';
import type { ExportDialog, ExportPropertyMaps } from '../export';
import type { NumberCommitInfo } from '../fields/number';
import type { PropertyExportSectionId, SectionSpec } from './catalog';
import type { FieldBooleanKey, FieldNumberKey, FieldStringKey } from './keys';
import type { NodePropertyMaps, NumberPropertyKey } from './node';
import type { PropertiesTabId } from './tabs';
import type { FillColorStop, TextFillPropertyKey, TextPropertyMaps } from './text';

const POLL_MS = 200;

function emptyTextMaps(): TextPropertyMaps
{
    return { numbers: [], booleans: [], strings: [], fillStops: null };
}

type FieldBinding = {
    root: HTMLElement;
    destroy: () => void;
    present: (maps: ExportPropertyMaps) => boolean;
    sync: (maps: ExportPropertyMaps) => void;
    numberKey?: NumberPropertyKey;
};

function bindField<T>(
    field: {
        root: HTMLElement;
        isBusy: () => boolean;
        destroy: () => void;
        setDisplay: (value: T | undefined) => void;
    },

    present: (maps: ExportPropertyMaps) => boolean,
    read: (maps: ExportPropertyMaps) => T | undefined,
    numberKey?: NumberPropertyKey,
): FieldBinding
{
    return {
        root    : field.root,
        destroy : field.destroy,
        present,
        numberKey,

        sync: (maps) =>
        {
            if (field.isBusy())
            {
                return;
            }

            field.setDisplay(read(maps));
        },
    };
}

type PropertiesForm = {
    element: HTMLElement;
    scrollElement: HTMLElement;

    openNodeExport: (nodeName: string) => void;
    destroy: () => void;
};

export function createPropertiesForm(selection: SelectionChannel): PropertiesForm
{
    const element = document.createElement('div');

    Object.assign(element.style, {
        position      : 'relative',
        display       : 'flex',
        flexDirection : 'column',
        flex          : '1',
        minHeight     : '0',
        minWidth      : '0',
        overflow      : 'hidden',
        boxSizing     : 'border-box',
        fontSize      : '12px',
        background    : '#303030',
    });

    const scrollElement = document.createElement('div');

    Object.assign(scrollElement.style, {
        flex               : '1',
        minHeight          : '0',
        minWidth           : '0',
        display            : 'flex',
        flexDirection      : 'column',
        overflowX          : 'hidden',
        overflowY          : 'auto',
        overscrollBehavior : 'contain',
        touchAction        : 'pan-y',
        padding            : '8px',
        boxSizing          : 'border-box',
        background         : '#303030',
    });

    const objectPane = document.createElement('div');

    Object.assign(objectPane.style, {
        display       : 'flex',
        flexDirection : 'column',
        gap           : '6px',
    });

    objectPane.setAttribute('role', 'tabpanel');
    objectPane.setAttribute('aria-label', 'Object Properties');

    const textPane = document.createElement('div');

    Object.assign(textPane.style, {
        display       : 'none',
        flexDirection : 'column',
        gap           : '6px',
    });

    textPane.setAttribute('role', 'tabpanel');
    textPane.setAttribute('aria-label', 'Text Properties');

    function showTab(id: PropertiesTabId)
    {
        const showObject = id === 'object';

        objectPane.style.display = showObject ? 'flex' : 'none';
        textPane.style.display = showObject ? 'none' : 'flex';
    }

    const tabs = createPropertiesTabs('object', showTab);

    type BuiltSection = {
        id: PropertyExportSectionId;
        root: HTMLElement;
        fields: Array<FieldBinding>;

        syncVisibility: (
            objectMaps: NodePropertyMaps,
            textMaps: TextPropertyMaps,
            multi: boolean,
        ) => void;

        syncValues: (
            objectMaps: NodePropertyMaps,
            textMaps: TextPropertyMaps,
        ) => void;
    };

    const builtObject: Array<BuiltSection> = [];
    const builtText: Array<BuiltSection> = [];
    let objectMaps: NodePropertyMaps = { numbers: [], booleans: [], strings: [] };
    let textMaps: TextPropertyMaps = emptyTextMaps();
    let activeExportDialog: ExportDialog | null = null;
    let selectedId: string | null = null;
    let selectedIds: Array<string> = [];
    let selectedNodeName: string | null = null;

    function currentExportMaps(): ExportPropertyMaps
    {
        return { object: objectMaps, text: textMaps };
    }

    function selectedNodes(): Array<PixiNode>
    {
        return resolveAliveNodesByIds(selectedIds);
    }

    function applyNumber(key: FieldNumberKey, value: number, info: NumberCommitInfo)
    {
        if (selectedIds.length > 1)
        {
            applyTransformNumber(selectedNodes(), key as NumberPropertyKey, value, info);

            return;
        }

        if (!isNodeAlive(selectedNode()))
        {
            return;
        }

        resolveNumberMap(currentExportMaps(), key)?.set(value);
    }

    function applyBoolean(key: FieldBooleanKey, value: boolean)
    {
        if (!isNodeAlive(selectedNode()))
        {
            return;
        }

        resolveBooleanMap(currentExportMaps(), key)?.set(value);
    }

    function applyString(key: FieldStringKey, value: string)
    {
        const node = selectedNode();

        if (!isNodeAlive(node))
        {
            return;
        }

        resolveStringMap(currentExportMaps(), key)?.set(value);

        if (key === 'label' || key === 'name')
        {
            const typeName = typeNameOf(node);
            const display = value || typeName || null;

            selectedNodeName = display;

            selection.publish({
                id   : selectedId,
                name : display,
                ids  : selectedId ? [selectedId] : [],
            });
        }
    }

    function applyFillStops(key: TextFillPropertyKey, value: Array<FillColorStop>)
    {
        if (!isNodeAlive(selectedNode()))
        {
            return;
        }

        if (key !== 'style.fill')
        {
            return;
        }

        textMaps.fillStops?.set(value);
    }

    function openSectionExport(sectionId: PropertyExportSectionId, title: string)
    {
        if (selectedIds.length > 1)
        {
            return;
        }

        activeExportDialog?.close();

        activeExportDialog = openExportDialog({
            kind         : 'section',
            sectionId,
            title,
            fileBaseName : selectedNodeName || title,
            getMaps      : currentExportMaps,
        });
    }

    function openNodeExport(nodeName: string)
    {
        activeExportDialog?.close();

        activeExportDialog = openExportDialog({
            kind         : 'node',
            title        : `node: ${nodeName}`,
            fileBaseName : nodeName,
            getMaps      : currentExportMaps,
        });
    }

    function buildSection(section: SectionSpec, pane: HTMLElement, target: Array<BuiltSection>)
    {
        const ui = createSection(section.title, true, () =>
        {
            openSectionExport(section.id, section.title);
        });

        const fields: Array<FieldBinding> = [];

        for (const fieldSpec of section.fields)
        {
            if (fieldSpec.kind === 'number')
            {
                const field = createNumberField(fieldSpec, applyNumber);
                const numberKey = isTextNumberKey(fieldSpec.key) ? undefined : fieldSpec.key;

                fields.push(bindField(
                    field,
                    (maps) => !!resolveNumberMap(maps, fieldSpec.key),
                    (maps) => resolveNumberMap(maps, fieldSpec.key)?.get(),
                    numberKey,
                ));

                ui.body.appendChild(field.root);
            }
            else if (fieldSpec.kind === 'boolean')
            {
                const field = createBooleanField(fieldSpec, applyBoolean);

                fields.push(bindField(
                    field,
                    (maps) => !!resolveBooleanMap(maps, field.key),
                    (maps) => resolveBooleanMap(maps, field.key)?.get(),
                ));

                ui.body.appendChild(field.root);
            }
            else if (fieldSpec.kind === 'select')
            {
                const field = createSelectField(fieldSpec, applyString);

                fields.push(bindField(
                    field,
                    (maps) => !!resolveStringMap(maps, field.key),
                    (maps) => resolveStringMap(maps, field.key)?.get(),
                ));

                ui.body.appendChild(field.root);
            }
            else if (fieldSpec.kind === 'color')
            {
                const field = createColorField(fieldSpec, applyString);

                fields.push(bindField(
                    field,
                    (maps) => !!resolveStringMap(maps, field.key),
                    (maps) => resolveStringMap(maps, field.key)?.get(),
                ));

                ui.body.appendChild(field.root);
            }
            else if (fieldSpec.kind === 'fillStops')
            {
                const field = createFillStopsField(fieldSpec, applyFillStops);

                fields.push(bindField(
                    field,
                    (maps) => !!maps.text.fillStops && maps.text.fillStops.key === field.key,
                    (maps) => (maps.text.fillStops?.key === field.key
                        ? maps.text.fillStops.get()
                        : undefined),
                ));

                ui.body.appendChild(field.root);
            }
            else
            {
                const field = createTextField(fieldSpec, applyString);

                fields.push(bindField(
                    field,
                    (maps) => !!resolveStringMap(maps, field.key),
                    (maps) => resolveStringMap(maps, field.key)?.get(),
                ));

                ui.body.appendChild(field.root);
            }
        }

        const builtSection: BuiltSection = {
            id   : section.id,
            root : ui.root,
            fields,

            syncVisibility: (nextObject, nextText, multi) =>
            {
                const maps = { object: nextObject, text: nextText };
                let any = false;

                for (const field of fields)
                {
                    let show = field.present(maps);

                    if (multi)
                    {
                        show = section.id === 'transform'
                            && !!field.numberKey
                            && MULTI_TRANSFORM_KEYS.has(field.numberKey);
                    }

                    field.root.style.display = show ? 'flex' : 'none';

                    if (show)
                    {
                        any = true;
                    }
                }

                ui.root.style.display = any ? 'block' : 'none';

                ui.setExportEnabled(!multi);
            },

            syncValues: (nextObject, nextText) =>
            {
                const maps = { object: nextObject, text: nextText };

                for (const field of fields)
                {
                    field.sync(maps);
                }
            },
        };

        target.push(builtSection);
        pane.appendChild(ui.root);
    }

    for (const section of OBJECT_FORM_SECTIONS)
    {
        buildSection(section, objectPane, builtObject);
    }

    for (const section of TEXT_FORM_SECTIONS)
    {
        buildSection(section, textPane, builtText);
    }

    scrollElement.appendChild(objectPane);
    scrollElement.appendChild(textPane);
    element.appendChild(tabs.root);
    element.appendChild(scrollElement);

    function selectedNode(): PixiNode | null
    {
        const win = globalThis as PageGlobals;
        const node = win.$pixi ?? null;

        if (!node)
        {
            return null;
        }

        if (isNodeAlive(node))
        {
            return node;
        }

        win.$pixi = undefined;
        selectedId = null;
        selectedIds = [];
        selectedNodeName = null;

        clearSelectionIds();
        selection.publish({ id: null, name: null, ids: [] });

        return null;
    }

    function readSharedNumber(key: NumberPropertyKey, nodes: Array<PixiNode>): number | undefined
    {
        let shared: number | undefined;
        let first = true;

        for (const node of nodes)
        {
            const maps = mapsForNode(node);
            const value = resolveNumberMap({ object: maps, text: emptyTextMaps() }, key)?.get();

            if (first)
            {
                shared = value;
                first = false;

                continue;
            }

            if (value !== shared)
            {
                return undefined;
            }
        }

        return first ? undefined : shared;
    }

    function multiObjectMaps(nodes: Array<PixiNode>): NodePropertyMaps
    {
        const numbers: NodePropertyMaps['numbers'] = [];

        for (const key of MULTI_TRANSFORM_KEYS)
        {
            let available = false;

            for (const node of nodes)
            {
                const maps = mapsForNode(node);

                if (resolveNumberMap({ object: maps, text: emptyTextMaps() }, key))
                {
                    available = true;

                    break;
                }
            }

            if (!available)
            {
                continue;
            }

            const shared = readSharedNumber(key, nodes);

            numbers.push({
                key,
                get : () => shared,
                set : () => undefined,
            });
        }

        return { numbers, booleans: [], strings: [] };
    }

    function syncFromNode()
    {
        try
        {
            if (selectedIds.length > 1)
            {
                const nodes = selectedNodes();

                objectMaps = multiObjectMaps(nodes);
                textMaps = emptyTextMaps();

                tabs.setTextAvailable(false);
                tabs.setActive('object');
                showTab('object');

                objectPane.style.visibility = nodes.length > 0 ? 'visible' : 'hidden';
                textPane.style.visibility = 'hidden';

                for (const section of builtObject)
                {
                    section.syncVisibility(objectMaps, textMaps, true);
                    section.syncValues(objectMaps, textMaps);
                }

                for (const section of builtText)
                {
                    section.root.style.display = 'none';
                }

                return;
            }

            const node = selectedNode();

            objectMaps = mapsForNode(node);
            textMaps = textMapsForNode(node);

            const hasObject = !!node && (
                objectMaps.numbers.length > 0
                || objectMaps.booleans.length > 0
                || objectMaps.strings.length > 0
            );

            const hasText = !!node && (
                textMaps.numbers.length > 0
                || textMaps.booleans.length > 0
                || textMaps.strings.length > 0
            );

            objectPane.style.visibility = hasObject ? 'visible' : 'hidden';
            textPane.style.visibility = hasText ? 'visible' : 'hidden';

            tabs.setTextAvailable(hasText);

            if (hasObject)
            {
                for (const section of builtObject)
                {
                    section.syncVisibility(objectMaps, textMaps, false);
                    section.syncValues(objectMaps, textMaps);
                }
            }

            if (hasText)
            {
                for (const section of builtText)
                {
                    section.syncVisibility(objectMaps, textMaps, false);
                    section.syncValues(objectMaps, textMaps);
                }
            }
            else
            {
                for (const section of builtText)
                {
                    section.root.style.display = 'none';
                }
            }
        }
        catch
        {
            objectMaps = { numbers: [], booleans: [], strings: [] };

            textMaps = emptyTextMaps();

            objectPane.style.visibility = 'hidden';
            textPane.style.visibility = 'hidden';

            tabs.setTextAvailable(false);
        }
    }

    syncFromNode();

    const timer = window.setInterval(syncFromNode, POLL_MS);

    const unsubscribeSelection = selection.subscribe((info) =>
    {
        selectedId = info.id;
        selectedNodeName = info.name;
        selectedIds = info.ids;

        if (info.id === null && info.name === null)
        {
            const win = globalThis as PageGlobals;

            win.$pixi = undefined;

            clearSelectionIds();
        }

        syncFromNode();
    });

    showTab('object');

    return {
        element,
        scrollElement,
        openNodeExport,

        destroy: () =>
        {
            activeExportDialog?.close();
            activeExportDialog = null;

            window.clearInterval(timer);
            unsubscribeSelection();
            tabs.destroy();

            for (const section of [...builtObject, ...builtText])
            {
                for (const field of section.fields)
                {
                    field.destroy();
                }
            }

            element.remove();
        },
    };
}
