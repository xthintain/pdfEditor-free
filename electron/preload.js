const { contextBridge, ipcRenderer } = require('electron')

// 安全地暴露API到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件操作
  showSaveDialog: () => ipcRenderer.invoke('show-save-dialog'),
  showOpenDialog: () => ipcRenderer.invoke('show-open-dialog'),
  
  // 文件系统操作（通过主进程）
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),
  
  // 应用信息
  getVersion: () => ipcRenderer.invoke('get-version'),
  getPlatform: () => process.platform,
  
  // 事件监听
  onOpenFile: (callback) => {
    ipcRenderer.on('open-file', (event, filePath) => callback(filePath))
  },
  
  onSaveFile: (callback) => {
    ipcRenderer.on('save-file', () => callback())
  },
  
  // 移除监听器
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel)
  },
  
  // 通知主进程
  notifyReady: () => ipcRenderer.send('renderer-ready'),
  
  // 开发者工具相关
  isDev: () => process.env.NODE_ENV === 'development',
  
  // 系统操作
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  // 应用控制
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  closeWindow: () => ipcRenderer.send('close-window')
})

// 开发环境下的调试信息
if (process.env.NODE_ENV === 'development') {
  console.log('🚀 Electron预加载脚本已加载')
  console.log('📱 平台:', process.platform)
  console.log('🔧 开发模式已启用')
}