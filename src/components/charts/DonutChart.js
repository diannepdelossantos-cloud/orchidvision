import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

// Renders a ring/donut chart from `data` = [{ label, value, color }, ...].
// Values don't need to already sum to 100 — they're normalized here.
// Drawn with stacked stroke-dasharray segments on a single circle, which
// is simpler and just as crisp as building individual arc <Path>s.
export default function DonutChart({ data, size = 120, strokeWidth = 18 }) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let offsetSoFar = 0;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {data.map((item) => {
            const fraction = item.value / total;
            const segmentLength = fraction * circumference;
            const dashArray = `${segmentLength} ${circumference - segmentLength}`;
            const dashOffset = -offsetSoFar;
            offsetSoFar += segmentLength;

            return (
              <Circle
                key={item.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={item.color}
                strokeWidth={strokeWidth}
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                fill="transparent"
              />
            );
          })}
        </G>
      </Svg>
    </View>
  );
}