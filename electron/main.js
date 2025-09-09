const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron')
const path = require('path')
const fs = require('fs')

// 保持对窗口对象的全局引用
let mainWindow

// 检查是否为开发模式
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

async function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 1000,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: !isDev // 开发模式下关闭web安全检查
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    show: false, // 先隐藏，加载完成后再显示
    titleBarStyle: 'default'
  })

  // 窗口加载完成后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    
    // 开发环境下打开DevTools
    if (isDev) {
      mainWindow.webContents.openDevTools()
    }
  })

  // 加载应用
  if (isDev) {
    console.log('🚀 开发模式启动')
    // 开发环境：尝试连接Vite开发服务器以支持热重载
    // 尝试多个常见的Vite开发端口
    const devPorts = [5173, 5174, 5175, 3000, 8080]
    let loaded = false
    
    for (const port of devPorts) {
      const devUrl = `http://localhost:${port}`
      console.log('🔥 尝试连接开发服务器:', devUrl)
      
      try {
        await mainWindow.loadURL(devUrl)
        console.log('✅ 成功连接开发服务器:', devUrl)
        loaded = true
        break
      } catch (error) {
        console.log('❌ 连接失败，尝试下一个端口...')
        continue
      }
    }
    
    if (!loaded) {
      console.warn('⚠️  所有开发服务器端口都无法连接，回退到本地文件')
      // 回退到本地文件
      const localPath = path.join(__dirname, '../index.html')
      console.log('🏠 回退加载本地文件:', localPath)
      
      if (fs.existsSync(localPath)) {
        mainWindow.loadFile(localPath)
      } else {
        console.error('❌ 找不到index.html文件')
        showErrorPage()
      }
    }
  } else {
    // 生产环境：加载构建后的文件
    const distPath = path.join(__dirname, '../dist/index.html')
    console.log('📦 生产模式，加载构建文件:', distPath)
    
    if (fs.existsSync(distPath)) {
      mainWindow.loadFile(distPath)
    } else {
      console.error('❌ 构建文件不存在，请运行 npm run build')
      showErrorPage()
    }
  }

  // 处理窗口关闭
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // 处理外部链接
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // 阻止导航到外部页面
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl)
    // 允许本地开发服务器的所有端口
    const isLocalDev = parsedUrl.hostname === 'localhost' && 
                      parseInt(parsedUrl.port) >= 3000 && parseInt(parsedUrl.port) <= 8080
    if (!isLocalDev && parsedUrl.origin !== 'file://') {
      event.preventDefault()
    }
  })

  // 创建应用菜单
  createMenu()
}

// 显示错误页面
function showErrorPage() {
  const errorHtml = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <title>PDF编辑器 - 启动错误</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
          padding: 40px; 
          text-align: center; 
          background: #f5f5f5;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          padding: 40px;
          border-radius: 10px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .error { 
          color: #d32f2f; 
          font-size: 24px;
          margin: 20px 0;
          font-weight: bold;
        }
        .solution { 
          background: #f8f9fa; 
          padding: 20px; 
          border-radius: 8px; 
          margin: 20px 0; 
          text-align: left;
          border-left: 4px solid #007bff;
        }
        .solution h3 {
          margin-top: 0;
          color: #007bff;
        }
        pre {
          background: #000;
          color: #0f0;
          padding: 10px;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
        }
        .icon {
          font-size: 64px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">⚠️</div>
        <h1>PDF编辑器启动错误</h1>
        <div class="error">找不到应用文件</div>
        <div class="solution">
          <h3>🔧 解决方案：</h3>
          <p><strong>1. 确保在项目根目录运行应用</strong></p>
          <p><strong>2. 安装依赖：</strong></p>
          <pre>npm install</pre>
          <p><strong>3. 启动开发服务器：</strong></p>
          <pre>npm run dev</pre>
          <p><strong>4. 或者直接运行：</strong></p>
          <pre>npm start</pre>
        </div>
        <p style="margin-top: 30px; color: #666;">
          文件路径: ${process.cwd()}
        </p>
      </div>
    </body>
    </html>
  `
  
  const tempPath = path.join(__dirname, '../temp-error.html')
  fs.writeFileSync(tempPath, errorHtml)
  mainWindow.loadFile(tempPath)
  
  // 5秒后删除临时文件
  setTimeout(() => {
    try {
      fs.unlinkSync(tempPath)
    } catch (error) {
      // 忽略删除错误
    }
  }, 5000)
}

// 安装开发者扩展
async function installDevExtensions() {
  const { default: installExtension, REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS } = require('electron-devtools-installer')
  
  try {
    // 可以安装各种开发者工具
    console.log('开发模式：DevTools已启用')
  } catch (error) {
    console.log('开发者扩展安装失败:', error)
  }
}

// 创建应用菜单
function createMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '打开PDF',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openFile'],
              filters: [
                { name: 'PDF文件', extensions: ['pdf'] }
              ]
            })
            
            if (!result.canceled && result.filePaths.length > 0) {
              // 通知渲染进程打开文件
              mainWindow.webContents.send('open-file', result.filePaths[0])
            }
          }
        },
        {
          label: '保存',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('save-file')
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit()
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectall', label: '全选' }
      ]
    },
    {
      label: '查看',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'forceReload', label: '强制重新加载' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '实际大小' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize', label: '最小化' },
        { role: 'close', label: '关闭' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于PDF编辑器',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于',
              message: 'PDF编辑器 Pro',
              detail: '专业的PDF编辑工具\n版本: 1.0.0\n基于Electron和现代Web技术构建'
            })
          }
        }
      ]
    }
  ]

  // macOS特殊处理
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about', label: '关于 ' + app.getName() },
        { type: 'separator' },
        { role: 'services', label: '服务' },
        { type: 'separator' },
        { role: 'hide', label: '隐藏 ' + app.getName() },
        { role: 'hideothers', label: '隐藏其他' },
        { role: 'unhide', label: '显示全部' },
        { type: 'separator' },
        { role: 'quit', label: '退出 ' + app.getName() }
      ]
    })
  }

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// IPC处理程序
ipcMain.handle('show-save-dialog', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: 'PDF文件', extensions: ['pdf'] },
      { name: '图片文件', extensions: ['png', 'jpg', 'jpeg'] }
    ]
  })
  return result
})

ipcMain.handle('show-open-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'PDF文件', extensions: ['pdf'] },
      { name: '图片文件', extensions: ['png', 'jpg', 'jpeg'] }
    ]
  })
  return result
})

// 文件系统操作
ipcMain.handle('read-file', async (event, filePath) => {
  const fs = require('fs').promises
  try {
    const data = await fs.readFile(filePath)
    return data
  } catch (error) {
    console.error('读取文件失败:', error)
    throw error
  }
})

ipcMain.handle('write-file', async (event, filePath, data) => {
  const fs = require('fs').promises
  try {
    await fs.writeFile(filePath, data)
    return { success: true }
  } catch (error) {
    console.error('写入文件失败:', error)
    throw error
  }
})

// 应用信息
ipcMain.handle('get-version', () => {
  return app.getVersion()
})

ipcMain.handle('open-external', async (event, url) => {
  await shell.openExternal(url)
})

// 窗口控制
ipcMain.on('minimize-window', () => {
  mainWindow.minimize()
})

ipcMain.on('close-window', () => {
  mainWindow.close()
})

ipcMain.on('renderer-ready', () => {
  console.log('渲染进程就绪')
})

// 应用事件处理
app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// 安全相关
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault()
    shell.openExternal(navigationUrl)
  })
})