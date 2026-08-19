import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import { TYPOGRAPHY } from '../../utils/theme';

// Simple vertical bar chart for { label, value } data, with a fixed
// [yMin, yMax] range and dashed gridlines — matches the "Accuracy by
// Model Version" card on the Data & Model > Metrics tab.
export default function BarChart({
  data,
  height = 160,
  color = '#4CAF50',
  yMin = 0,
  yMax,
  yTicks = 4,
  textColor = '#6B7280',
  barColor = '#9CA3AF',
}) {
  const [containerWidth, setContainerWidth] = React.useState(0);
  const paddingLeft = 30;
  const paddingRight = 8;
  const paddingTop = 10;
  const paddingBottom = 22;

  const maxValue = yMax ?? Math.max(...data.map((d) => d.value)) * 1.05;
  const chartWidth = Math.max(containerWidth - paddingLeft - paddingRight, 1);
  const chartHeight = height - paddingTop - paddingBottom;
  const range = maxValue - yMin || 1;

  const barSlot = chartWidth / data.length;
  const barWidth = Math.min(barSlot * 0.5, 40);

  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => Math.round(yMin + (range / yTicks) * i));

  return (
    <View style={{ height }} onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
      {containerWidth > 0 && (
        <Svg width={containerWidth} height={height}>
          {ticks.map((tickValue) => {
            const y = paddingTop + chartHeight - ((tickValue - yMin) / range) * chartHeight;
            return (
              <Line
                key={tickValue}
                x1={paddingLeft}
                x2={containerWidth - paddingRight}
                y1={y}
                y2={y}
                stroke="#E0E0E0"
                strokeDasharray="3,4"
                strokeWidth={1}
              />
            );
          })}

          {data.map((d, i) => {
            const barHeight = ((d.value - yMin) / range) * chartHeight;
            const x = paddingLeft + i * barSlot + (barSlot - barWidth) / 2;
            const y = paddingTop + chartHeight - barHeight;
            return (
              <Rect
                key={d.label}
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 2)}
                rx={4}
                fill={d.color || barColor || color}
              />
            );
          })}
        </Svg>
      )}

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {ticks.map((tickValue) => {
          const y = paddingTop + chartHeight - ((tickValue - yMin) / range) * chartHeight;
          return (
            <Text key={tickValue} style={[styles.axisLabel, { color: textColor, top: y - 7 }]}>
              {tickValue}
            </Text>
          );
        })}
      </View>

      <View style={styles.xAxisRow}>
        {data.map((d) => (
          <Text key={d.label} style={[styles.xAxisLabel, { color: textColor, width: barSlot }]}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  axisLabel: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    position: 'absolute',
    left: 0,
    width: 28,
  },
  xAxisRow: {
    position: 'absolute',
    bottom: 0,
    left: 30,
    right: 8,
    flexDirection: 'row',
  },
  xAxisLabel: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    textAlign: 'center',
  },
});