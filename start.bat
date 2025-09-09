@echo off
echo 🚀 PDF编辑器桌面应用 - 启动脚本
echo.

echo 📦 检查依赖...
if not exist "node_modules" (
    echo 📦 正在安装依赖...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ 依赖安装失败，请检查Node.js是否正确安装
        pause
        exit /b 1
    )
) else (
    echo ✅ 依赖已存在
)

echo.
echo 🎯 选择启动模式:
echo [1] 直接启动桌面应用 (快速启动)
echo [2] 开发模式 (热重载 + 桌面应用)
echo.
set /p choice="请选择 (1 或 2): "

if "%choice%"=="1" (
    echo 🚀 启动桌面应用...
    npm run start-direct
) else if "%choice%"=="2" (
    echo 🔥 启动开发模式...
    echo 📝 将同时启动Vite开发服务器和Electron窗口
    echo 📝 文件修改后会自动刷新应用
    npm run start
) else (
    echo 🚀 默认启动桌面应用...
    npm run start-direct
)