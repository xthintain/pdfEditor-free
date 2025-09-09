@echo off
echo ============================================
echo    PDF编辑器 - 热重载开发模式启动
echo ============================================
echo.

echo 🔧 检查依赖...
if not exist node_modules (
    echo ⚠️  依赖未安装，正在安装...
    call npm install
    if errorlevel 1 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
)

echo.
echo 🚀 启动热重载开发模式...
echo.
echo 📝 说明：
echo   - Vite开发服务器将在 http://localhost:5173 启动
echo   - Electron窗口会自动连接到开发服务器
echo   - 文件修改后会自动刷新应用
echo.

REM 使用concurrently同时启动Vite和Electron
call npm run start

echo.
echo 👋 感谢使用PDF编辑器！
pause