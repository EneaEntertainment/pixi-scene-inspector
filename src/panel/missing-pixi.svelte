<script lang="ts">
  type Props = {
    message: string;
    lastError: string;
  };

  const { message, lastError }: Props = $props();

</script>

<div class="empty">
  <p>{message}</p>
  {#if lastError}
    <pre class="err">{lastError}</pre>
  {/if}
  <pre class="hint">globalThis.__PIXI_APP__ = app;</pre>
  <p class="hint-note">
    Or set <code>__PIXI_STAGE__</code> / <code>__PIXI_RENDERER__</code>.
    Selected node is exposed as <code>$pixi</code> in the page console.
  </p>
</div>

<style>
  .empty {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
    justify-content: center;
    padding: 32px;
    max-width: 560px;
  }

  .empty p {
    margin: 0;
    line-height: 1.4;
  }

  .hint {
    margin: 0;
    padding: 10px 12px;
    font-size: 12px;
    color: #1a7a1a;
    background: #fff;
    border: 1.5px solid #111;
    box-shadow: 3px 3px 0 #111;
  }

  .hint-note {
    font-size: 11px;
    color: #cfcfcf;
  }

  .hint-note code {
    color: #ffe066;
  }

  .err {
    margin: 0;
    padding: 8px;
    font-size: 11px;
    color: #ffb4b4;
    word-break: break-word;
    white-space: pre-wrap;
    background: #2a2a2a;
  }
</style>
