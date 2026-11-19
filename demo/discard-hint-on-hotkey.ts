import { isEditableKeyTarget } from '../src/editable-keys';
import { DEFAULT_TOGGLE_HOTKEY, matchesHotkey } from '../src/hotkey';

export function discardHintOnInspectorHotkey()
{
    window.addEventListener('keydown', (event) =>
    {
        if (!matchesHotkey(event, DEFAULT_TOGGLE_HOTKEY) || isEditableKeyTarget(event.target))
        {
            return;
        }

        document.getElementById('hint')?.remove();
    });
}
