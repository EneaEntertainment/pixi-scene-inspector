export function encodeTextFieldValue(value: string): string
{
    return value
        .replace(/\\/g, '\\\\')
        .replace(/\r/g, '\\r')
        .replace(/\n/g, '\\n');
}

export function decodeTextFieldValue(value: string): string
{
    return value.replace(/\\([\\nr])/g, (_match, ch: string) =>
    {
        if (ch === 'n')
        {
            return '\n';
        }

        if (ch === 'r')
        {
            return '\r';
        }

        return '\\';
    });
}
