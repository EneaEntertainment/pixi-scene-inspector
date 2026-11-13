import { isNodeAlive } from '../../page-ops/pixi-node';
import { isAimable3D, isCamera3D } from '../../page-ops/props-3d';
import { resolveAliveNodesByIds } from '../../page-ops/resolve-selection';
import { clearSelectionIds } from '../../page-ops/selection-ids';
import { typeNameOf } from '../../page-ops/types';
import { openExportDialog } from '../export';
import { createAim3DSection } from './aim-3d-section';
import {
    CAMERA_FORM_SECTIONS,
    LIGHT_FORM_SECTIONS,
    MATERIAL_FORM_SECTIONS,
    OBJECT_FORM_SECTIONS,
    TEXT_FORM_SECTIONS,
    VIEW_FORM_SECTIONS,
} from './catalog';
import {
    createBooleanField,
    createColorField,
    createFillStopsField,
    createNumberField,
    createSection,
    createSelectField,
    createTextField,
    createTextureField,
} from './fields';
import { isTextNumberKey, resolveBooleanMap, resolveNumberMap, resolveStringMap } from './keys';
import { createModel3DSection } from './model-3d-section';
import { mapsForNode } from './node';
import { createSpineSection } from './spine-section';
import { createPropertiesTabs } from './tabs';
import { textMapsForNode } from './text';
import { createTextureSection } from './texture-section';
import { applyTransformNumber, MULTI_TRANSFORM_KEYS } from './transform-apply';

import type { PageGlobals, PixiNode } from '../../page-ops/pixi-node';
import type { SelectionChannel } from '../../selection-channel';
import type { ExportDialog, ExportPropertyMaps } from '../export';
import type { NumberCommitInfo } from '../fields/number';
import type { PropertyExportSectionId, SectionSpec } from './catalog';
import type { FieldBooleanKey, FieldNumberKey, FieldStringKey } from './keys';
import type { NodePropertyMaps, NumberPropertyKey } from './node';
import type { OptionalPropertiesTabId, PropertiesTabId } from './tabs';
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

    type TabHost = {
        id: PropertiesTabId;
        pane: HTMLElement;
        built: Array<BuiltSection>;
    };

    function createTabPane(label: string, visible: boolean): HTMLElement
    {
        const pane = document.createElement('div');

        Object.assign(pane.style, {
            display       : visible ? 'flex' : 'none',
            flexDirection : 'column',
            gap           : '6px',
        });

        pane.setAttribute('role', 'tabpanel');
        pane.setAttribute('aria-label', label);

        return pane;
    }

    const hosts: Array<TabHost> = [
        { id: 'object', pane: createTabPane('Object Properties', true), built: [] },
        { id: 'text', pane: createTabPane('Text Properties', false), built: [] },
        { id: 'material', pane: createTabPane('Material Properties', false), built: [] },
        { id: 'light', pane: createTabPane('Light Properties', false), built: [] },
        { id: 'camera', pane: createTabPane('Camera Properties', false), built: [] },
        { id: 'view', pane: createTabPane('View Properties', false), built: [] },
    ];

    const hostById = new Map<PropertiesTabId, TabHost>(hosts.map((host) => [host.id, host]));

    function showTab(id: PropertiesTabId)
    {
        for (const host of hosts)
        {
            host.pane.style.display = host.id === id ? 'flex' : 'none';
        }
    }

    const tabs = createPropertiesTabs('object', showTab);

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

    function applyNumber(key: FieldNumberKey, value: number, info: NumberCommitInfo)
    {
        if (selectedIds.length > 1)
        {
            applyTransformNumber(resolveAliveNodesByIds(selectedIds), key as NumberPropertyKey, value, info);

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

    function applyTextureString(key: FieldStringKey, value: string): string | null
    {
        const node = selectedNode();

        if (!isNodeAlive(node))
        {
            return null;
        }

        const mapping = resolveStringMap(currentExportMaps(), key);

        if (!mapping)
        {
            return null;
        }

        const before = mapping.get() ?? '';
        const trimmed = value.trim();

        if (trimmed === before)
        {
            return before;
        }

        mapping.set(trimmed);

        const after = mapping.get() ?? '';

        if (after === before)
        {
            return null;
        }

        return after;
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
            else if (fieldSpec.kind === 'texture')
            {
                const field = createTextureField(fieldSpec, applyTextureString);

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

    const spineSection = createSpineSection();
    const model3dSection = createModel3DSection();
    const aim3dSection = createAim3DSection();

    const textureSection = createTextureSection(() =>
    {
        openSectionExport('texture', 'Texture');
    });

    const objectHost = hostById.get('object')!;
    const textHost = hostById.get('text')!;
    const materialHost = hostById.get('material')!;
    const lightHost = hostById.get('light')!;
    const cameraHost = hostById.get('camera')!;
    const viewHost = hostById.get('view')!;

    function buildTabSections(host: TabHost, sections: Array<SectionSpec>)
    {
        for (const section of sections)
        {
            buildSection(section, host.pane, host.built);
        }
    }

    buildTabSections(objectHost, OBJECT_FORM_SECTIONS);

    const identitySection = objectHost.built.find((section) => section.id === 'identity');

    if (identitySection)
    {
        identitySection.root.after(spineSection.root, model3dSection.root, textureSection.root);
    }

    buildTabSections(textHost, TEXT_FORM_SECTIONS);
    buildTabSections(materialHost, MATERIAL_FORM_SECTIONS);
    buildTabSections(lightHost, LIGHT_FORM_SECTIONS);
    buildTabSections(cameraHost, CAMERA_FORM_SECTIONS);
    buildTabSections(viewHost, VIEW_FORM_SECTIONS);

    for (const host of hosts)
    {
        scrollElement.appendChild(host.pane);
    }

    element.appendChild(tabs.root);
    element.appendChild(scrollElement);

    function placeAimSection(node: PixiNode | null)
    {
        if (!node || !isAimable3D(node))
        {
            aim3dSection.root.remove();

            return;
        }

        const host = isCamera3D(node) ? cameraHost.pane : lightHost.pane;

        if (aim3dSection.root.parentElement !== host)
        {
            host.appendChild(aim3dSection.root);
        }
    }

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

    function mapsHavePrefix(maps: NodePropertyMaps, prefix: string): boolean
    {
        for (const entry of maps.numbers)
        {
            if (entry.key.startsWith(prefix))
            {
                return true;
            }
        }

        for (const entry of maps.booleans)
        {
            if (entry.key.startsWith(prefix))
            {
                return true;
            }
        }

        for (const entry of maps.strings)
        {
            if (entry.key.startsWith(prefix))
            {
                return true;
            }
        }

        return false;
    }

    function hideBuiltSections(sections: Array<BuiltSection>)
    {
        for (const section of sections)
        {
            section.root.style.display = 'none';
        }
    }

    function syncBuiltSections(
        sections: Array<BuiltSection>,
        nextObject: NodePropertyMaps,
        nextText: TextPropertyMaps,
        multi: boolean,
    )
    {
        for (const section of sections)
        {
            section.syncVisibility(nextObject, nextText, multi);
            section.syncValues(nextObject, nextText);
        }
    }

    function setOptionalTabsAvailable(flags: Record<OptionalPropertiesTabId, boolean>)
    {
        for (const id of Object.keys(flags) as Array<OptionalPropertiesTabId>)
        {
            tabs.setAvailable(id, flags[id]);
        }
    }

    function setHostVisibility(id: PropertiesTabId, visible: boolean)
    {
        const host = hostById.get(id);

        if (host)
        {
            host.pane.style.visibility = visible ? 'visible' : 'hidden';
        }
    }

    function syncFromNode()
    {
        try
        {
            if (selectedIds.length > 1)
            {
                const nodes = resolveAliveNodesByIds(selectedIds);

                objectMaps = multiObjectMaps(nodes);
                textMaps = emptyTextMaps();

                setOptionalTabsAvailable({
                    text     : false,
                    material : false,
                    light    : false,
                    camera   : false,
                    view     : false,
                });
                tabs.setActive('object');
                showTab('object');

                setHostVisibility('object', nodes.length > 0);
                setHostVisibility('text', false);
                setHostVisibility('material', false);
                setHostVisibility('light', false);
                setHostVisibility('camera', false);
                setHostVisibility('view', false);

                syncBuiltSections(objectHost.built, objectMaps, textMaps, true);
                hideBuiltSections(textHost.built);
                hideBuiltSections(materialHost.built);
                hideBuiltSections(lightHost.built);
                hideBuiltSections(cameraHost.built);
                hideBuiltSections(viewHost.built);

                spineSection.sync(null);
                model3dSection.sync(null);
                aim3dSection.sync(null);
                placeAimSection(null);
                textureSection.sync(null, true);

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

            const hasMaterial = !!node && mapsHavePrefix(objectMaps, 'material.');
            const hasLight = !!node && mapsHavePrefix(objectMaps, 'light.');
            const hasCamera = !!node && (
                mapsHavePrefix(objectMaps, 'camera.')
                || mapsHavePrefix(objectMaps, 'orbit.')
            );
            const hasView = !!node && mapsHavePrefix(objectMaps, 'view3d.');

            setHostVisibility('object', hasObject);
            setHostVisibility('text', hasText);
            setHostVisibility('material', hasMaterial);
            setHostVisibility('light', hasLight);
            setHostVisibility('camera', hasCamera);
            setHostVisibility('view', hasView);

            setOptionalTabsAvailable({
                text     : hasText,
                material : hasMaterial,
                light    : hasLight,
                camera   : hasCamera,
                view     : hasView,
            });

            const hostFlags: Array<{ host: TabHost; available: boolean }> = [
                { host: objectHost, available: hasObject },
                { host: textHost, available: hasText },
                { host: materialHost, available: hasMaterial },
                { host: lightHost, available: hasLight },
                { host: cameraHost, available: hasCamera },
                { host: viewHost, available: hasView },
            ];

            for (const entry of hostFlags)
            {
                if (entry.available)
                {
                    syncBuiltSections(entry.host.built, objectMaps, textMaps, false);
                }
                else
                {
                    hideBuiltSections(entry.host.built);
                }
            }

            spineSection.sync(node);
            model3dSection.sync(node);
            placeAimSection(node);
            aim3dSection.sync(node);
            textureSection.sync(node);
        }
        catch
        {
            objectMaps = { numbers: [], booleans: [], strings: [] };

            textMaps = emptyTextMaps();

            setHostVisibility('object', false);
            setHostVisibility('text', false);
            setHostVisibility('material', false);
            setHostVisibility('light', false);
            setHostVisibility('camera', false);
            setHostVisibility('view', false);

            setOptionalTabsAvailable({
                text     : false,
                material : false,
                light    : false,
                camera   : false,
                view     : false,
            });
            spineSection.sync(null);
            model3dSection.sync(null);
            aim3dSection.sync(null);
            placeAimSection(null);
            textureSection.sync(null);
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
            spineSection.destroy();
            model3dSection.destroy();
            aim3dSection.destroy();
            textureSection.destroy();

            for (const host of hosts)
            {
                for (const section of host.built)
                {
                    for (const field of section.fields)
                    {
                        field.destroy();
                    }
                }
            }

            element.remove();
        },
    };
}
