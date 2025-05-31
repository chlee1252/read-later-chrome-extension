#!/bin/bash

# PNG 아이콘 생성 스크립트
# macOS에서 사용 가능 (ImageMagick 또는 librsvg 필요)

echo "🎨 PNG 아이콘 생성 중..."

# 필요한 도구 확인
if command -v rsvg-convert >/dev/null 2>&1; then
    CONVERTER="rsvg-convert"
elif command -v magick >/dev/null 2>&1; then
    CONVERTER="magick"
elif command -v convert >/dev/null 2>&1; then
    CONVERTER="convert"
else
    echo "❌ SVG 변환 도구가 없습니다."
    echo "📦 다음 중 하나를 설치하세요:"
    echo "   brew install librsvg"
    echo "   brew install imagemagick"
    exit 1
fi

SIZES=(16 32 48 128)
SVG_FILE="icons/icon.svg"
DIST_ICONS="dist/icons"

for size in "${SIZES[@]}"; do
    output_file="${DIST_ICONS}/icon${size}.png"
    
    if [ "$CONVERTER" = "rsvg-convert" ]; then
        rsvg-convert -w $size -h $size "$SVG_FILE" -o "$output_file"
    elif [ "$CONVERTER" = "magick" ]; then
        magick "$SVG_FILE" -resize ${size}x${size} "$output_file"
    else
        convert "$SVG_FILE" -resize ${size}x${size} "$output_file"
    fi
    
    if [ $? -eq 0 ]; then
        echo "✅ 생성됨: icon${size}.png"
    else
        echo "❌ 실패: icon${size}.png"
    fi
done

echo "🎉 아이콘 생성 완료!"
