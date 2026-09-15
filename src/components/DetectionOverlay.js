import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

// Most screens render the photo with resizeMode="cover" inside a fixed-size
// box, so whenever the source photo's aspect ratio doesn't match the box,
// one axis gets cropped — detectDiseaseRegions() normalizes boxes against
// the *full* source image, so drawing them at face value (box fraction *
// displayed box size) would drift off the visible crop on any photo that
// isn't already box-shaped. The full-screen zoom view instead shows the
// whole photo uncropped ("contain"), which needs different math (scale +
// letterbox offset, no cropping). toDisplayRect() below redoes whichever of
// React Native's two fit algorithms the caller is actually using.
export default function DetectionOverlay({ imageUri, detections = [], resizeMode = 'cover' }) {
  const [layout, setLayout] = useState(null);
  const [sourceSize, setSourceSize] = useState(null);

  useEffect(() => {
    if (!imageUri) return undefined;
    let cancelled = false;
    Image.getSize(
      imageUri,
      (width, height) => {
        if (!cancelled) setSourceSize({ width, height });
      },
      () => {}, // best-effort — if this fails, boxes just don't render
    );
    return () => {
      cancelled = true;
    };
  }, [imageUri]);

  if (!detections.length) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={(e) => setLayout(e.nativeEvent.layout)}>
      {layout && sourceSize && (
        <Svg width={layout.width} height={layout.height} style={StyleSheet.absoluteFill}>
          {detections.map((d, i) => {
            const rect = toDisplayRect(d.box, layout, sourceSize, resizeMode);
            if (!rect) return null;
            return (
              <Rect
                key={i}
                x={rect.x}
                y={rect.y}
                width={rect.width}
                height={rect.height}
                stroke="#e53935"
                strokeWidth={2}
                fill="rgba(229,57,53,0.08)"
                rx={4}
              />
            );
          })}
        </Svg>
      )}

      <View style={styles.captionBar}>
        <Text style={styles.captionText}>Affected regions highlighted</Text>
      </View>
    </View>
  );
}

// Maps a box normalized against the full source image into pixel coordinates
// within the displayed box, for whichever fit mode React Native is using.
function toDisplayRect(box, layout, sourceSize, resizeMode) {
  if (resizeMode === 'contain') return toContainRect(box, layout, sourceSize);
  return toCoverRect(box, layout, sourceSize);
}

// "contain": the whole source image is visible, scaled down to fit with
// letterbox padding on one axis — nothing is cropped, so every box maps
// directly via a single scale + offset.
function toContainRect(box, layout, sourceSize) {
  const boxRatio = layout.width / layout.height;
  const srcRatio = sourceSize.width / sourceSize.height;

  let scale;
  let offsetX = 0;
  let offsetY = 0;

  if (srcRatio > boxRatio) {
    scale = layout.width / sourceSize.width;
    offsetY = (layout.height - sourceSize.height * scale) / 2;
  } else {
    scale = layout.height / sourceSize.height;
    offsetX = (layout.width - sourceSize.width * scale) / 2;
  }

  return {
    x: offsetX + box.x * sourceSize.width * scale,
    y: offsetY + box.y * sourceSize.height * scale,
    width: box.width * sourceSize.width * scale,
    height: box.height * sourceSize.height * scale,
  };
}

// "cover": the box is filled completely, cropping whichever axis overflows.
// Returns null when the box falls entirely outside the visible crop
// (nothing to draw), and clips partial overlaps to the visible edge.
function toCoverRect(box, layout, sourceSize) {
  const boxRatio = layout.width / layout.height;
  const srcRatio = sourceSize.width / sourceSize.height;

  let visibleW = sourceSize.width;
  let visibleH = sourceSize.height;
  let offsetX = 0;
  let offsetY = 0;

  if (srcRatio > boxRatio) {
    // Source is wider than the box (relative to height) — full height is
    // visible, the sides are cropped.
    visibleW = sourceSize.height * boxRatio;
    offsetX = (sourceSize.width - visibleW) / 2;
  } else {
    visibleH = sourceSize.width / boxRatio;
    offsetY = (sourceSize.height - visibleH) / 2;
  }

  const srcX = box.x * sourceSize.width;
  const srcY = box.y * sourceSize.height;
  const srcW = box.width * sourceSize.width;
  const srcH = box.height * sourceSize.height;

  if (srcX + srcW < offsetX || srcX > offsetX + visibleW) return null;
  if (srcY + srcH < offsetY || srcY > offsetY + visibleH) return null;

  const clippedX = Math.max(srcX, offsetX);
  const clippedY = Math.max(srcY, offsetY);
  const clippedX2 = Math.min(srcX + srcW, offsetX + visibleW);
  const clippedY2 = Math.min(srcY + srcH, offsetY + visibleH);

  const scaleX = layout.width / visibleW;
  const scaleY = layout.height / visibleH;

  return {
    x: (clippedX - offsetX) * scaleX,
    y: (clippedY - offsetY) * scaleY,
    width: (clippedX2 - clippedX) * scaleX,
    height: (clippedY2 - clippedY) * scaleY,
  };
}

const styles = StyleSheet.create({
  captionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  captionText: { color: '#fff', fontSize: 11, fontWeight: '600' },
});
