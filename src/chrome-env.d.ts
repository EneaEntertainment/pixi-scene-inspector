type ChromeStorageChange = {
    oldValue?: unknown;
    newValue?: unknown;
};

type ChromeStorageArea = {
    get(keys?: string | Array<string> | Record<string, unknown> | null): Promise<Record<string, unknown>>;
    set(items: Record<string, unknown>): Promise<void>;
};

declare const chrome: {
    storage: {
        sync: ChromeStorageArea;
        onChanged: {
            addListener: (
                callback: (
                    changes: Record<string, ChromeStorageChange>,
                    areaName: string,
                ) => void,
            ) => void;
        };
    };
};
