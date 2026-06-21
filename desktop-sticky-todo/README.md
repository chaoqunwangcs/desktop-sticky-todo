# Desktop Sticky Todo

透明桌面待办与日历挂件 —— 类似「小黄条」(yynote) 的开源替代品。

把待办清单和日历嵌在 Windows 桌面壁纸上，**按 `Win+D` 回到桌面时不会被隐藏**，始终可见。

## ✨ 功能特性

- 🖼️ **桌面嵌入**：窗口嵌入壁纸层，Win+D 不隐藏，开机即用
- ✅ **待办清单**：增删改查、拖拽排序、完成归档、标签分类、置顶、日期倒数
- 📅 **日历挂件**：月视图、日历上显示待办点、点击日期查看当日待办
- 🔗 **待办日历联动**：给待办设日期后日历自动显示；拖拽待办到日历日期可重新规划
- 🎨 **透明玻璃拟态**：背景模糊、透明度可调、适配任意壁纸、8 种强调色
- ⚙️ **设置面板**：透明度/模糊/主题色/鼠标穿透/开机自启/默认视图/每周起始
- 💾 **本地存储**：所有数据保存在本地 JSON 文件，无需账号、无需联网
- 🖱️ **系统托盘**：显示/隐藏/设置/退出

## 🛠️ 技术栈

| 层 | 技术 |
|---|---|
| 外壳 | Tauri 2 (Rust) |
| 前端 | React 19 + TypeScript + Vite |
| 样式 | Tailwind CSS |
| 状态 | Zustand |
| 拖拽 | @dnd-kit |
| 日期 | date-fns |
| 图标 | lucide-react |
| 存储 | @tauri-apps/plugin-store |

## 🚀 快速开始

### 前置条件

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/) (stable)
- Windows 10/11 + WebView2 Runtime（系统预装）

### 开发

```bash
npm install
npm run tauri dev
```

### 构建 Windows 安装包

```bash
npm run tauri build
```

生成的 `.msi` 安装包在 `src-tauri/target/release/bundle/msi/`。

## 🔧 核心原理：桌面嵌入

关键代码在 [src-tauri/src/desktop.rs](src-tauri/src/desktop.rs)，原理：

1. 找到桌面进程 `Progman` 窗口
2. 向其发送未公开消息 `0x052C`，让它生成 `WorkerW` 图层（壁纸之上、桌面图标之下）
3. 调用 Win32 `SetParent(我们的窗口, WorkerW)` 把窗口过继到该图层
4. 窗口成为桌面的一部分，Win+D 显示桌面时不会被隐藏

参考了 Rainmeter、Wallpaper Engine 等项目的实现方式。

## 📁 项目结构

```
desktop-sticky-todo/
├── src-tauri/              # Rust 后端
│   └── src/
│       ├── lib.rs          # 应用入口、插件、托盘
│       └── desktop.rs      # 桌面嵌入核心
├── src/                    # React 前端
│   ├── components/
│   │   ├── TitleBar.tsx        # 拖拽标题栏 + 视图切换
│   │   ├── TodoWidget.tsx      # 待办挂件
│   │   ├── TodoItem.tsx        # 单条待办（可拖拽）
│   │   ├── CalendarWidget.tsx  # 日历挂件
│   │   └── SettingsPanel.tsx   # 设置面板
│   ├── store.ts            # Zustand 全局状态 + 持久化
│   ├── types.ts            # 类型定义
│   └── utils.ts            # 工具函数
└── package.json
```

## 📝 许可证

MIT

