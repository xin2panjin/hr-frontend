<template>
  <div class="page-shell">
    <div
      v-if="error"
      class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {{ error }}
    </div>

    <div class="grid gap-4 md:grid-cols-3">
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <span class="text-sm text-slate-500">7 天新增</span>
          <span class="icon-tile"
            ><el-icon><User /></el-icon
          ></span>
        </div>
        <div class="mt-3 text-3xl font-semibold text-slate-950">{{ totalCandidates7d }}</div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <span class="text-sm text-slate-500">日均新增</span>
          <span class="icon-tile"
            ><el-icon><TrendCharts /></el-icon
          ></span>
        </div>
        <div class="mt-3 text-3xl font-semibold text-slate-950">{{ averageCandidates }}</div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <span class="text-sm text-slate-500">单日峰值</span>
          <span class="icon-tile"
            ><el-icon><DataLine /></el-icon
          ></span>
        </div>
        <div class="mt-3 text-3xl font-semibold text-slate-950">{{ maxCandidates }}</div>
      </div>
    </div>

    <div class="surface">
      <div class="surface-header">
        <div>
          <div class="surface-title">近 7 天新增候选人</div>
          <div class="surface-subtitle">按日期统计候选人入库数量</div>
        </div>
        <div class="flex items-center gap-2">
          <el-tag v-if="loading" type="info" effect="plain">加载中</el-tag>
          <el-button size="small" :loading="loading" @click="refresh">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </div>
      <div ref="chartEl" class="h-[360px] w-full px-4 py-4" style="height: 320px"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import * as echarts from 'echarts'
import { getLatest7DaysCandidates } from '@/apis/dashboard_api'
import { DataLine, Refresh, TrendCharts, User } from '@element-plus/icons-vue'

const loading = ref(false)
const error = ref<string | null>(null)

const chartEl = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null

const chartDays = ref<string[]>([])
const chartCounts = ref<number[]>([])

const totalCandidates7d = computed(() => {
  return chartCounts.value.reduce((sum, count) => sum + count, 0)
})

const averageCandidates = computed(() => {
  if (chartCounts.value.length === 0) return 0
  return Math.round((totalCandidates7d.value / chartCounts.value.length) * 10) / 10
})

const maxCandidates = computed(() => {
  return Math.max(0, ...chartCounts.value)
})

const renderChart = () => {
  if (!chartEl.value) return

  if (!chart) {
    chart = echarts.init(chartEl.value)
  }

  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 23, 42, 0.88)',
      borderWidth: 0,
      textStyle: {
        color: '#F8FAFC',
      },
      axisPointer: {
        type: 'line',
        lineStyle: {
          color: '#94A3B8',
          width: 1,
        },
      },
    },
    grid: {
      left: 16,
      right: 16,
      top: 22,
      bottom: 18,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: chartDays.value,
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        color: '#64748B',
      },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      splitLine: {
        lineStyle: {
          color: '#E2E8F0',
          type: 'dashed',
        },
      },
      axisLabel: {
        color: '#64748B',
      },
    },
    series: [
      {
        name: '候选人人数',
        type: 'line',
        smooth: true,
        data: chartCounts.value,
        showSymbol: false,
        lineStyle: {
          width: 3,
          color: '#2563EB',
          shadowColor: 'rgba(37, 99, 235, 0.22)',
          shadowBlur: 8,
        },
        itemStyle: {
          color: '#2563EB',
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            borderColor: '#EEF2FF',
            borderWidth: 2,
          },
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(37, 99, 235, 0.2)' },
            { offset: 1, color: 'rgba(37, 99, 235, 0.02)' },
          ]),
        },
      },
    ],
  })
}

const refresh = async () => {
  loading.value = true
  error.value = null

  try {
    const data = await getLatest7DaysCandidates()

    chartDays.value = data.map((item) => item.day)
    chartCounts.value = data.map((item) => item.count)

    await nextTick()
    renderChart()
  } catch (err) {
    console.error(err)
    error.value = '获取近 7 天候选人趋势失败，请稍后重试。'
  } finally {
    loading.value = false
  }
}

const handleResize = () => {
  chart?.resize()
}

onMounted(async () => {
  await refresh()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
  chart = null
})
</script>
