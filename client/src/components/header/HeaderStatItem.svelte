<script lang="ts">
  import type { HeaderStatOption } from '../../lib/header/headerStats';

  type HeaderStatItemProps = {
    stat: HeaderStatOption;
    value: string;
    mobile: boolean;
  };

  let { stat, value, mobile }: HeaderStatItemProps = $props();

  let itemClass = $derived(mobile
    ? `stat-item${stat.spaced ? ' mb-2' : ''}`
    : `stat-item${stat.spaced ? ' me-3' : ''}`);
  let valueId = $derived(mobile ? stat.mobileId : stat.id);
  let labelId = $derived(mobile ? stat.mobileLabelId : stat.labelId);
</script>

<div class={itemClass}>
  <i class={`bi ${stat.icon} me-1`}></i> <span id={valueId}>{value}</span> <span id={labelId}>{stat.label}</span>
</div>
