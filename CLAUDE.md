# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个功能完整的基于浏览器的PDF编辑器，使用纯JavaScript构建，无需后端服务器。项目结合了PDF.js（用于PDF渲染和文本提取）和PDF-lib（用于PDF编辑和修改）两个强大的库，提供专业级的PDF处理能力。

## 核心架构

### 双PDF引擎架构
- **PDF.js (pdfjsLib)**：负责PDF文件的渲染显示和文本内容提取
- **PDF-lib (PDFLib)**：负责PDF文件的编辑修改操作（添加文本、图片、页面操作等）
- **同步机制**：修改PDF后通过`updatePdfDisplay()`方法重新加载PDF.js实例以保持显示同步

### 主要组件
- **PDFEditor类** (`js/pdfEditor.js`): 核心控制器，管理所有PDF操作
  - 状态管理：当前页面、缩放比例、编辑模式等
  - 双引擎协调：维护PDF.js和PDF-lib的实例同步
  - 事件处理：文件上传、页面导航、编辑操作等
  - 高级功能：PDF合并、分割、图片插入、书签管理

### 关键数据流
1. 文件上传 → 同时加载到PDF.js和PDF-lib
2. PDF编辑 → PDF-lib修改 → 重新生成字节 → PDF.js重新加载显示
3. 文本提取 → PDF.js处理 → 分页显示结果
4. 图片处理 → PDF-lib嵌入 → 更新显示
5. PDF合并/分割 → PDF-lib操作 → 生成新文档

## 完整功能列表

### PDF查看功能
- 文件上传（拖拽和点击）
- 页面导航（上一页/下一页）
- 缩放控制（放大/缩小/适合页面）
- 多页面支持和页码显示

### 文本编辑功能
- 添加文本（自定义位置、大小、颜色）
- 文本提取（按页面分组）
- 文本复制到剪贴板
- 实时文本预览

### 图片处理功能
- 本地图片插入（JPG/PNG）
- 网络图片URL插入
- 自动尺寸调整和优化
- 保持图片比例

### 页面管理功能
- 新增/删除页面
- 页面旋转（90度增量）
- 页面复制/重复
- 页面信息显示

### 高级工具功能
- PDF文件合并（多文件批量处理）
- PDF智能分割（按页数或页面范围）
- 书签管理（自定义标题和位置）
- 批量文件处理

### 文件操作功能
- PDF文件下载保存
- 页面导出为图片
- 打印功能
- 清空重置

## 开发命令

```bash
# 安装依赖
npm install

# 启动本地HTTP服务器（必需，不能直接打开HTML文件）
npm start
# 访问 http://localhost:8080

# 项目演示页面
# 访问 http://localhost:8080/demo.html

# 生成测试PDF文件
# 打开 generate-test-pdf.html 在浏览器中
```

## 重要约束和注意事项

### 浏览器安全限制
- **必须使用HTTP服务器**：由于CORS政策，不能直接在浏览器中打开`file://`协议的HTML
- **CDN依赖**：PDF.js和PDF-lib通过CDN加载，首次运行需要网络连接

### PDF处理限制  
- **纯前端处理**：所有PDF操作在客户端完成，不涉及服务器上传
- **内存限制**：大文件（>50MB）可能导致性能问题
- **字体限制**：只支持PDF标准字体，自定义字体可能显示异常
- **图片格式**：只支持JPG和PNG格式图片
- **编辑范围**：主要支持添加新内容，不支持修改现有PDF内容

### 状态同步机制
编辑操作后必须调用以下流程保持状态一致：
1. PDF-lib执行编辑操作
2. 调用`updatePdfDisplay()`重新加载PDF.js显示
3. 调用`renderPage()`刷新当前页面显示
4. 调用`updatePageInfo()`更新UI状态

### 文件结构
- `index.html`: 主界面，包含完整的UI组件和高级功能面板
- `demo.html`: 项目演示页面，展示功能特性
- `styles/main.css`: 响应式样式，包含模态框和高级UI组件
- `js/pdfEditor.js`: 核心逻辑，单一类管理所有功能（1000+行）
- `generate-test-pdf.html`: 测试工具，用于生成示例PDF文件
- `USER_GUIDE.md`: 详细的用户使用指南
- `CLAUDE.md`: 开发指南和架构文档

## 扩展开发指南

### 添加新的PDF操作
1. 在PDFEditor类中添加对应方法
2. 确保使用PDF-lib进行修改操作
3. 修改后调用`updatePdfDisplay()`同步显示
4. 添加相应的错误处理和用户反馈
5. 更新UI控制面板和事件监听器

### UI组件扩展
- 所有UI元素在`setupElements()`中注册
- 事件监听器在`setupEventListeners()`中统一管理
- 使用`showToast()`方法提供用户反馈
- 使用`showLoading()`方法显示处理状态
- 模态框通过CSS类控制显示/隐藏

### 高级功能实现要点
- **图片处理**：使用`embedJpg()`和`embedPng()`方法
- **PDF合并**：通过`copyPages()`复制页面到目标文档
- **PDF分割**：创建新文档并复制指定页面范围
- **书签管理**：维护内存中的书签数组
- **状态管理**：多种模式标志控制用户交互

### 性能优化建议
- 大文件处理时使用异步操作和加载指示器
- 及时清理不需要的对象引用
- 使用防抖处理频繁触发的事件
- 分批处理大量页面操作