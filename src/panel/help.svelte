<script lang="ts">
  type Props = {
    onclose: () => void;
  };

  const { onclose }: Props = $props();

  function close()
  {
      onclose();
  }
</script>

<div class="help">
  <div class="help-head">
    <h2 class="help-title">Keyboard shortcuts</h2>
    <button type="button" class="btn" onclick={close}>Close</button>
  </div>
  <dl class="help-list">
    <div class="help-row">
      <dt><kbd>Click</kbd></dt>
      <dd>Select node</dd>
    </div>
    <div class="help-row">
      <dt><kbd>Click</kbd> again or <kbd>+</kbd> / <kbd>=</kbd></dt>
      <dd>Expand one level</dd>
    </div>
    <div class="help-row">
      <dt><kbd>⌥/Alt</kbd>+click or <kbd>-</kbd> / <kbd>_</kbd></dt>
      <dd>Collapse one level</dd>
    </div>
    <div class="help-row">
      <dt><kbd>←</kbd> <kbd>→</kbd></dt>
      <dd>Move among siblings</dd>
    </div>
    <div class="help-row">
      <dt><kbd>↑</kbd> <kbd>↓</kbd></dt>
      <dd>Parent / first child (↓ expands)</dd>
    </div>
    <div class="help-row">
      <dt><kbd>⌥/Alt</kbd>+arrows</dt>
      <dd>First/last sibling · root / deepest first child</dd>
    </div>
    <div class="help-row">
      <dt><kbd>I</kbd></dt>
      <dd>Isolate selected subtree (toggle)</dd>
    </div>
    <div class="help-row">
      <dt><kbd>H</kbd></dt>
      <dd>Toggle visible (not Camera3D / Scene3D)</dd>
    </div>
    <div class="help-row">
      <dt>Drag</dt>
      <dd>Reparent node</dd>
    </div>
    <div class="help-row">
      <dt><kbd>⌥/Alt</kbd> + number scrub / arrows</dt>
      <dd>Snap value to nearest step</dd>
    </div>
    <div class="help-row">
      <dt><kbd>Esc</kbd></dt>
      <dd>Cancel drag / restore value to start / close this help</dd>
    </div>
    <div class="help-row">
      <dt><kbd>⌘/Ctrl</kbd>+<kbd>C</kbd> then <kbd>⌘/Ctrl</kbd>+<kbd>V</kbd></dt>
      <dd>Copy node, paste as child of selection</dd>
    </div>
    <div class="help-row">
      <dt><kbd>?</kbd></dt>
      <dd>Toggle this help</dd>
    </div>
  </dl>
  <p class="help-note">
    Selected node is exposed as <code>$pixi</code> in the page console.
  </p>
</div>

<style>
  .help {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 16px;
    padding: 24px 32px;
    overflow: auto;
  }

  .help-head {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .help-title {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
  }

  .btn {
    padding: 4px 10px;
    font-family: inherit;
    font-size: 11px;
    font-weight: 700;
    color: #111;
    cursor: pointer;
    background: #fff;
    border: 1.5px solid #111;
    box-shadow: 2px 2px 0 #111;
  }

  .btn:active {
    transform: translate(1px, 1px);
    box-shadow: 1px 1px 0 #111;
  }

  .help-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 0;
    max-width: 560px;
  }

  .help-row {
    display: grid;
    grid-template-columns: minmax(140px, 220px) 1fr;
    gap: 12px;
    align-items: baseline;
  }

  .help-row dt {
    margin: 0;
    font-size: 11px;
    color: #ffe066;
  }

  .help-row dd {
    margin: 0;
    font-size: 12px;
    color: #f0f0f0;
  }

  .help-row kbd {
    display: inline-block;
    padding: 1px 5px;
    font-family: inherit;
    font-size: 11px;
    color: #111;
    background: #fff;
    border: 1.5px solid #111;
    box-shadow: 1px 1px 0 #111;
  }

  .help-note {
    margin: 0;
    max-width: 560px;
    font-size: 11px;
    color: #cfcfcf;
  }

  .help-note code {
    color: #ffe066;
  }
</style>
