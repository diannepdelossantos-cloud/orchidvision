import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { TYPOGRAPHY } from '../../utils/theme';

// Area/line chart for a series of { label, value } points, with y-axis
// gridlines and x-axis labels underneath — matches the "Scan Volume"
// card on the Home dashboard.
export default function LineAreaChart({
  data,
  height = 160,
  color = '#4CAF50',
  yMax,
  yTicks = 4,
  textColor = '#6B7280',
}) {
  const [containerWidth, setContainerWidth] = React.useState(0);
  const paddingLeft = 34;
  const paddingRight = 8;
  const paddingTop = 10;
  const paddingBottom = 22;

  const maxValue = yMax ?? Math.max(...data.map((d) => d.value), 1);
  const chartWidth = Math.max(containerWidth - paddingLeft - paddingRight, 1);
  const chartHeight = height - paddingTop - paddingBottom;

  const points = data.map((d, i) => ({
    x: paddingLeft + (chartWidth * i) / Math.max(data.length - 1, 1),
    y: paddingTop + chartHeight - (d.value / maxValue) * chartHeight,
    ...d,
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(paddingTop + chartHeight).toFixed(1)} ` +
        `L ${points[0].x.toFixed(1)} ${(paddingTop + chartHeight).toFixed(1)} Z`
      : '';

  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => Math.round((maxValue / yTicks) * i));

  return (
    <View
      style={{ height }}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {containerWidth > 0 && (
        <Svg width={containerWidth} height={height}>
          <Defs>
            <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.25} />
              <Stop offset="1" stopColor={color} stopOpacity={0.02} />
            </LinearGradient>
          </Defs>

          {ticks.map((tickValue) => {
            const y = paddingTop + chartHeight - (tickValue / maxValue) * chartHeight;
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

          {!!areaPath && <Path d={areaPath} fill="url(#areaFill)" />}
          {!!linePath && <Path d={linePath} fill="none" stroke={color} strokeWidth={2.5} />}
        </Svg>
      )}

      {/* Y-axis labels, absolutely positioned over the plot */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {ticks.map((tickValue) => {
          const y = paddingTop + chartHeight - (tickValue / maxValue) * chartHeight;
          return (
            <Text
              key={tickValue}
              style={[styles.axisLabel, { color: textColor, top: y - 7, left: 0 }]}
            >
              {tickValue}
            </Text>
          );
        })}
      </View>

      {/* X-axis labels */}
      <View style={styles.xAxisRow}>
        {data.map((d) => (
          <Text key={d.label} style={[styles.axisLabel, styles.xAxisLabel, { color: textColor }]}>
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
    width: 32,
    textAlign: 'left',
  },
  xAxisRow: {
    position: 'absolute',
    bottom: 0,
    left: 34,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xAxisLabel: {
    position: 'relative',
    width: 'auto',
    textAlign: 'center',
  },
});