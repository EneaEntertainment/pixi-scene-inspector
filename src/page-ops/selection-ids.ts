let selectionIds: Array<string> = [];

export function getSelectionIds(): ReadonlyArray<string>
{
    return selectionIds;
}

export function setSelectionIds(ids: Array<string>)
{
    selectionIds = ids;
}

export function clearSelectionIds()
{
    selectionIds = [];
}
