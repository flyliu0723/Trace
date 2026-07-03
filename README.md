# SpendWhere

手机行为时间线统计 App —— 记录「注意力花在哪里」，而非简单的屏幕使用时长。

## 产品定位

SpendWhere 的核心资产是**行为事件流**（Event Stream），而非聚合统计表：

```
08:10 unlock
08:11 微信
08:13 支付宝
08:14 screen_off
```

所有统计、可视化、AI 分析都从事件流派生，底层采集层只负责忠实记录。

## 技术架构

```
┌─────────────────────────────────────┐
│  Layer 3: 展示层 (React Native)      │
│  概览 / 洞察 / 时间线 / 按小时 / 设置 │
├─────────────────────────────────────┤
│  Layer 2: 分析层 (TypeScript)        │
│  会话切分 / 路径分析 / 模式 / 洞察引擎  │
├─────────────────────────────────────┤
│  Layer 1: 采集层 (Android Native)    │
│  解锁广播 / UsageStats / MediaSession │
├─────────────────────────────────────┤
│  存储: SQLite (op-sqlite)           │
│  behavior_events 事件表              │
└─────────────────────────────────────┘
```

## 技术栈

- **React Native 0.86** + TypeScript
- **React Navigation** — 底部 Tab 导航
- **op-sqlite** — 本地事件存储
- **Android Native Module** — 行为采集（`BehaviorMonitor`）

## 项目结构

```
src/
├── types/          # 事件与会话类型定义
├── constants/      # 阈值与配置常量
├── db/             # SQLite schema 与事件仓库
├── native/         # 原生模块 TypeScript 桥接
├── services/       # 监控服务封装
├── analysis/       # 会话切分与统计派生
├── components/     # UI 组件
├── screens/        # 页面
├── navigation/     # 导航配置
└── theme/          # 主题色与间距

android/.../monitor/
├── BehaviorMonitorModule.kt              # RN 桥接
├── BehaviorMonitorService.kt             # 前台采集服务
├── MediaSessionWatcher.kt                # 后台播客/音乐检测
├── UsageStatsReconciler.kt               # 系统数据对账补全
├── BootReceiver.kt                       # 开机自启恢复监控
├── MonitorPreferences.kt                 # 监控开关持久化
├── BatteryOptimizationHelper.kt        # 电池优化与 ROM 引导
├── SpendWhereNotificationListenerService.kt
├── BehaviorMonitorPackage.kt
└── EventStore.kt
```

## 快速开始

### 环境要求

- Node.js >= 22
- Android SDK（minSdk 24）
- JDK 17+

### 安装与运行

```bash
npm install
npm start
npm run android
```

### 首次使用

1. 打开 App → **设置** 页
2. 点击 **申请基础权限** → 授予「使用情况访问权限」和通知权限
3. 点击 **开启后台播客检测** → 在系统设置中开启 SpendWhere 的「通知使用权」
4. 点击 **开始监控** → 通知栏出现常驻通知
5. 返回 **概览** / **洞察** 查看数据

### AI 总结（可选）

1. **设置** → **AI 总结配置** → 填入 API Key
2. 支持 OpenAI 及兼容接口（DeepSeek、通义等），可自定义 API 地址和模型
3. **洞察** 页点击「生成 AI 总结」获取日报/周报
4. 生成结果缓存在本机，可一键分享

## 采集事件类型

| 事件 | 来源 | 说明 |
|------|------|------|
| `unlock` | BroadcastReceiver | 用户解锁手机 |
| `screen_off` | BroadcastReceiver | 屏幕关闭/锁屏 |
| `app_foreground` | UsageStatsManager | 应用切到前台 |
| `app_background` | UsageStatsManager | 应用切到后台 |
| `media_start` | MediaSession | 开始播放音频 |
| `media_pause` | MediaSession | 暂停播放 |
| `media_stop` | MediaSession | 停止播放 |

支持小宇宙、网易云、QQ 音乐等注册了 MediaSession 的播放器。事件 metadata 包含 `title`、`artist`、`album`。

## 开发路线图

- [x] RN 项目初始化
- [x] 事件流数据模型与 SQLite 存储
- [x] Android 原生采集模块（解锁 + App 前台）
- [x] 基础 UI（概览 / 时间线 / 按小时 / 设置）
- [x] MediaSession 后台播放检测
- [x] 开机自启与事件对账补偿
- [x] app_background 采集与事件去重
- [x] 历史日期切换与解锁热力图
- [x] 按小时 App 图标视图
- [x] 首次使用 Onboarding 引导
- [x] App 跳转路径分析
- [x] 行为模式识别与会话目标分析
- [x] 规则引擎行为洞察（本地，无需联网）
- [x] AI 日报 / 周报总结（OpenAI 兼容接口）
- [x] 总结分享与本地缓存
- [x] 现代精细主义 UI 重组（轨迹 / 洞察 / 时间线）
- [x] 设置页 grouped list 与 MonitorBanner
- [x] AI 洞察未配置态优化与数据详情卡片层级
- [x] 日记时间轴与游离空态专注勋章墙

版本历史见 [开发日记.md](./开发日记.md)。

## 权限说明

| 权限 | 用途 |
|------|------|
| `PACKAGE_USAGE_STATS` | 获取应用前台切换事件 |
| `FOREGROUND_SERVICE` | 后台持续采集解锁/锁屏事件 |
| `POST_NOTIFICATIONS` | 前台服务通知（Android 13+） |
| 通知使用权 | 获取 MediaSession，检测后台播客/音乐（不读取通知内容） |
| 电池优化豁免 | 降低后台被杀概率，配合开机自启 |

所有行为数据仅存储在本机。AI 总结仅在用户主动触发时，将结构化行为数据发送至配置的 API 地址，不会自动上传。

## License

Private
