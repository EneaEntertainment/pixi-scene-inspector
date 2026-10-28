<script lang="ts">
  import { onMount } from 'svelte';

  type Props = {
    message: string;
    source: string;
    showHelp: boolean;
    isolateLabel: string | null;
    autoRefresh: boolean;
    onautoRefreshChange: (value: boolean) => void;
    nameFilter: string;
    onnameFilterChange: (value: string) => void;
    ontoggleHelp: () => void;
    onrefresh: () => void;
    onBarReady?: (bar: HTMLElement) => void;
  };

  const {
      message,
      source,
      showHelp,
      isolateLabel,
      autoRefresh,
      onautoRefreshChange,
      nameFilter,
      onnameFilterChange,
      ontoggleHelp,
      onrefresh,
      onBarReady,
  }: Props = $props();

  let barEl: HTMLElement | undefined = $state();

  onMount(() =>
  {
      if (barEl)
      {
          onBarReady?.(barEl);
      }
  });
</script>

<header class="bar" bind:this={barEl}>
  <div class="title">Pixi Scene Inspector</div>
  <div class="meta" title={source}>{message}</div>
  <button
    type="button"
    class="help-btn"
    aria-label={showHelp ? 'Close help' : 'Keyboard shortcuts'}
    aria-pressed={showHelp}
    onclick={(e) =>
    {
        ontoggleHelp();
        e.currentTarget.blur();
    }}
  >
    ?
  </button>
  {#if isolateLabel !== null}
    <div class="iso">
      {isolateLabel}
    </div>
  {/if}
  <div class="filter">
    <input
      type="text"
      class="filter-input"
      placeholder="filter…"
      spellcheck="false"
      autocomplete="off"
      aria-label="Filter nodes by name"
      value={nameFilter}
      oninput={(e) => onnameFilterChange(e.currentTarget.value)}
    />
    {#if nameFilter.length > 0}
      <button
        type="button"
        class="filter-clear"
        aria-label="Clear filter"
        onclick={() => onnameFilterChange('')}
      >
        ×
      </button>
    {/if}
  </div>
  <label class="toggle">
    <input
      type="checkbox"
      checked={autoRefresh}
      onchange={(e) => onautoRefreshChange(e.currentTarget.checked)}
    />
    live
  </label>
  <button type="button" class="btn" onclick={onrefresh}>Refresh</button>
</header>

<style>
  .bar {
    display: flex;
    flex-shrink: 0;
    gap: 12px;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 2px solid #2e2e2e;
    background: #3a3a3a;
  }

  .title {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  .meta {
    overflow: hidden;
    font-size: 11px;
    color: #bdbdbd;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .help-btn {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    margin-right: auto;
    padding: 0;
    font-family: inherit;
    font-size: 12px;
    font-weight: 700;
    line-height: 1;
    color: #bdbdbd;
    cursor: pointer;
    background: transparent;
    border: 1.5px solid #bdbdbd;
    border-radius: 50%;
  }

  .help-btn:hover,
  .help-btn[aria-pressed="true"] {
    color: #111;
    background: #fff;
    border-color: #111;
  }

  .iso {
    flex-shrink: 0;
    max-width: 420px;
    overflow: hidden;
    font-size: 11px;
    color: #ffe066;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .toggle {
    display: flex;
    gap: 6px;
    align-items: center;
    font-size: 11px;
    color: #cfcfcf;
    user-select: none;
  }

  .filter {
    display: flex;
    flex-shrink: 0;
    gap: 4px;
    align-items: center;
  }

  .filter-input {
    width: 120px;
    padding: 3px 6px;
    font-family: inherit;
    font-size: 11px;
    color: #f0f0f0;
    background: #2e2e2e;
    border: 1.5px solid #111;
    outline: none;
  }

  .filter-input::placeholder {
    color: #888;
  }

  .filter-input:focus {
    border-color: #ffe066;
  }

  .filter-clear {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    padding: 0;
    font-family: inherit;
    font-size: 12px;
    font-weight: 700;
    line-height: 1;
    color: #bdbdbd;
    cursor: pointer;
    background: transparent;
    border: 1.5px solid #bdbdbd;
    border-radius: 50%;
  }

  .filter-clear:hover {
    color: #111;
    background: #fff;
    border-color: #111;
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
</style>
