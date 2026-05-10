#!/bin/zsh

cd "$(dirname "$0")" || exit 1

echo "正在启动 AccMGMT 本地预览..."
echo "预览地址：http://localhost:8788"
echo

npm run local
