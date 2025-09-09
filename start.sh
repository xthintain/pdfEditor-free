#!/bin/bash

echo "🚀 PDF编辑器桌面应用 - 快速设置"
echo ""

echo "📦 正在安装依赖..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败，请检查Node.js是否正确安装"
    exit 1
fi

echo ""
echo "✅ 依赖安装完成！"
echo ""
echo "🔥 启动开发环境（热重载 + 桌面应用）..."
echo ""

npm start