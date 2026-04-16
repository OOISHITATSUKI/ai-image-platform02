#!/bin/bash
# Generate a placeholder ambient audio track for the Live Action player.
# Produces a looping soft noise / silence mp3 at /public/companions/audio/ambient-ocean.mp3
# Requires: ffmpeg
#
# Replace with a real free-license ocean/ambient track before production.
#
# Usage: bash scripts/generate-placeholder-audio.sh

set -e

AUDIO_DIR="public/companions/audio"
mkdir -p "$AUDIO_DIR"

OUTPUT="$AUDIO_DIR/ambient-ocean.mp3"

if [ -f "$OUTPUT" ]; then
  echo "Skip: $OUTPUT already exists"
  exit 0
fi

# 10 seconds of low-volume pink noise — acts as a placeholder "ambience" that
# loops acceptably until a real sample replaces it.
ffmpeg -y -f lavfi -i "anoisesrc=color=pink:amplitude=0.08:duration=10" \
  -codec:a libmp3lame -qscale:a 5 "$OUTPUT" >/dev/null 2>&1

echo "Created $OUTPUT"
