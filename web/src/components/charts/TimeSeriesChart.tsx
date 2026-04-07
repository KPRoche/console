import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { CHART_TOOLTIP_CONTENT_STYLE, CHART_TICK_COLOR, CHART_TOOLTIP_TEXT_COLOR } from '../../lib/constants'

interface DataPoint {
  time: string
  value: number
  [key: string]: string | number
}

interface TimeSeriesChartProps {
  data: DataPoint[]
  dataKey?: string
  color?: string
  gradient?: boolean
  showGrid?: boolean
  showAxis?: boolean
  height?: number
  unit?: string
  title?: string
}

export function TimeSeriesChart({
  data,
  dataKey = 'value',
  color = '#9333ea',
  gradient = true,
  showGrid = false,
  showAxis = true,
  height = 200,
  unit = '',
  title,
}: TimeSeriesChartProps) {
  const option = useMemo(() => ({
    backgroundColor: 'transparent',
    grid: { left: showAxis ? 40 : 0, right: 5, top: 5, bottom: showAxis ? 25 : 0 },
    xAxis: {
      type: 'category' as const,
      data: data.map(d => d.time),
      show: showAxis,
      axisLabel: { color: '#888', fontSize: 10 },
      axisLine: { lineStyle: { color: '#333' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value' as const,
      show: showAxis,
      axisLabel: { color: '#888', fontSize: 10, formatter: (v: number) => `${v}${unit}` },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: showGrid ? { lineStyle: { color: '#333', type: 'dashed' as const } } : { show: false },
    },
    tooltip: {
      trigger: 'axis' as const,
      backgroundColor: (CHART_TOOLTIP_CONTENT_STYLE as Record<string, unknown>).backgroundColor as string,
      borderColor: (CHART_TOOLTIP_CONTENT_STYLE as Record<string, unknown>).borderColor as string,
      textStyle: { color: CHART_TOOLTIP_TEXT_COLOR, fontSize: 12 },
      formatter: (params: Array<{ name: string; value: number }>) => {
        const p = Array.isArray(params) ? params[0] : params
        return `<span style="color:${CHART_TICK_COLOR}">${p.name}</span><br/>${p.value}${unit}`
      },
    },
    series: [{
      type: gradient ? 'line' : 'line',
      data: data.map(d => d[dataKey]),
      smooth: true,
      showSymbol: false,
      lineStyle: { color, width: 2 },
      itemStyle: { color },
      ...(gradient ? {
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: color + '4D' },
              { offset: 1, color: color + '00' },
            ],
          },
        },
      } : {}),
      ...(!gradient ? {
        emphasis: { itemStyle: { color, borderWidth: 0 } },
      } : {}),
    }],
  }), [data, dataKey, color, gradient, showGrid, showAxis, unit])

  return (
    <div className="w-full">
      {title && (
        <h4 className="text-sm font-medium text-muted-foreground mb-2">{title}</h4>
      )}
      <div style={{ minHeight: Math.max(height, 100), width: '100%' }}>
        <ReactECharts
          option={option}
          style={{ height, width: '100%' }}
          notMerge={true}
          opts={{ renderer: 'svg' }}
        />
      </div>
    </div>
  )
}

// Multi-line chart for comparing multiple series
interface MultiSeriesChartProps {
  data: DataPoint[]
  series: Array<{
    dataKey: string
    color: string
    name?: string
  }>
  height?: number
  showGrid?: boolean
  title?: string
}

export function MultiSeriesChart({
  data,
  series,
  height = 200,
  showGrid = false,
  title,
}: MultiSeriesChartProps) {
  const option = useMemo(() => ({
    backgroundColor: 'transparent',
    grid: { left: 40, right: 5, top: 5, bottom: 25 },
    xAxis: {
      type: 'category' as const,
      data: data.map(d => d.time),
      axisLabel: { color: '#888', fontSize: 10 },
      axisLine: { lineStyle: { color: '#333' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value' as const,
      axisLabel: { color: '#888', fontSize: 10 },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: showGrid ? { lineStyle: { color: '#333', type: 'dashed' as const } } : { show: false },
    },
    tooltip: {
      trigger: 'axis' as const,
      backgroundColor: (CHART_TOOLTIP_CONTENT_STYLE as Record<string, unknown>).backgroundColor as string,
      borderColor: (CHART_TOOLTIP_CONTENT_STYLE as Record<string, unknown>).borderColor as string,
      textStyle: { color: CHART_TOOLTIP_TEXT_COLOR, fontSize: 12 },
    },
    series: series.map(s => ({
      name: s.name || s.dataKey,
      type: 'line',
      data: data.map(d => d[s.dataKey]),
      smooth: true,
      showSymbol: false,
      lineStyle: { color: s.color, width: 2 },
      itemStyle: { color: s.color },
    })),
  }), [data, series, showGrid])

  return (
    <div className="w-full">
      {title && (
        <h4 className="text-sm font-medium text-muted-foreground mb-2">{title}</h4>
      )}
      <div style={{ minHeight: Math.max(height, 100), width: '100%' }}>
        <ReactECharts
          option={option}
          style={{ height, width: '100%' }}
          notMerge={true}
          opts={{ renderer: 'svg' }}
        />
      </div>
    </div>
  )
}
