import { defineConfig } from 'vite'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  // 开发服务器配置
  server: {
    port: 5173,
    host: true,
    hmr: true, // 启用热模块替换
    watch: {
      usePolling: true // 在某些系统上需要轮询
    }
  },
  
  // 构建配置
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: 'index.html'
      }
    },
    // 复制静态资源
    copyPublicDir: true
  },
  
  // 公共目录设置
  publicDir: 'public',
  
  // 插件配置
  plugins: [
    // 支持旧浏览器
    legacy({
      targets: ['defaults', 'not IE 11']
    })
  ],
  
  // 资源处理
  assetsInclude: ['**/*.pdf'],
  
  // 优化依赖
  optimizeDeps: {
    include: ['pdf-lib', 'pdfjs-dist']
  },
  
  // CSS配置
  css: {
    devSourcemap: true
  },
  
  // 基础路径配置
  base: './',
  
  // 环境变量
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
})