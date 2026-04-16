#!/bin/bash
# Generate placeholder video files for companion live actions (Phase C)
# 5-second black mp4 with a text label for each action.
# Requires: ffmpeg
#
# Usage: bash scripts/generate-placeholder-videos.sh

set -e

VIDEO_DIR="public/companions/videos"
mkdir -p "$VIDEO_DIR"

CHARACTERS=("luna" "sophia" "mia" "victoria" "yuki" "aria" "chloe" "elena" "sakura" "madison" "isabella" "zoe" "natasha" "lily")

# Level 1-2 actions — dressed + undressed variants
DUAL_ACTIONS=("greeting" "sexy_tease")

# Level 4+ actions — undressed only
UNDRESSED_ONLY_ACTIONS=(
  "ahegao" "panty_tease" "get_all_fours" "beg_me" "rub_tits"
  "bounce_ass" "squirt"
  "handjob"
  "boobjob"
  "blowjob"
  "missionary" "blowjob_doggy"
)

COUNT=0

generate_one() {
  local out="$1"
  local label="$2"
  if [ -f "$out" ]; then
    return
  fi
  ffmpeg -y -f lavfi -i "color=c=black:size=480x720:rate=30:d=5" \
    -vf "drawtext=text='${label}':fontcolor=white:fontsize=22:x=(w-text_w)/2:y=(h-text_h)/2" \
    -c:v libx264 -pix_fmt yuv420p -t 5 "$out" >/dev/null 2>&1 || \
  ffmpeg -y -f lavfi -i "color=c=black:size=480x720:rate=30:d=5" \
    -c:v libx264 -pix_fmt yuv420p -t 5 "$out" >/dev/null 2>&1 || true
  COUNT=$((COUNT + 1))
}

for char in "${CHARACTERS[@]}"; do
  # Level 1-2 dressed & undressed
  for action in "${DUAL_ACTIONS[@]}"; do
    generate_one "$VIDEO_DIR/${char}-${action}-dressed.mp4"   "${char}|${action}|dressed"
    generate_one "$VIDEO_DIR/${char}-${action}-undressed.mp4" "${char}|${action}|undressed"
  done

  # Re-dress transition clips
  generate_one "$VIDEO_DIR/${char}-redress-off.mp4" "${char}|redress-off"
  generate_one "$VIDEO_DIR/${char}-redress-on.mp4"  "${char}|redress-on"

  # Level 4+ undressed-only actions
  for action in "${UNDRESSED_ONLY_ACTIONS[@]}"; do
    generate_one "$VIDEO_DIR/${char}-${action}-undressed.mp4" "${char}|${action}|undressed"
  done
done

echo "Created/checked $COUNT placeholder videos in $VIDEO_DIR"
