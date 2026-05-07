# 移动端 App 打包指南

## 项目已配置完成

- ✅ Capacitor 已安装
- ✅ Android 平台已添加
- ✅ 应用名称：错题本
- ✅ 包名：com.quizapp.app

---

## 一、打包 Android APK

### 前提条件

1. 安装 [Android Studio](https://developer.android.com/studio)
2. 配置 ANDROID_HOME 环境变量

### 打包步骤

```bash
# 1. 进入前端目录
cd quiz-app/client

# 2. 构建前端代码（确保 .env 中配置了正确的 VITE_API_URL）
npm run build

# 3. 同步到 Android 项目
npx cap sync android

# 4. 用 Android Studio 打开项目
npx cap open android
```

### 在 Android Studio 中打包 APK

1. 打开后等待 Gradle 同步完成
2. 菜单：**Build** → **Generate Signed Bundle / APK**
3. 选择 **APK** → **Next**
4. 创建或选择密钥库（KeyStore）
5. 选择 **release** 构建变体
6. 完成后 APK 在 `android/app/release/app-release.apk`

### 直接用命令行打包（无需签名）

```bash
cd android
./gradlew assembleDebug
# APK 位置：android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 二、打包 iOS（需要 Mac）

### 前提条件

- Mac 电脑
- Xcode 已安装
- Apple 开发者账号（发布到 App Store 需要）

### 打包步骤

```bash
# 1. 添加 iOS 平台（首次）
npx cap add ios

# 2. 构建 + 同步
npm run build
npx cap sync ios

# 3. 用 Xcode 打开
npx cap open ios
```

在 Xcode 中配置签名证书后，即可打包 IPA 或发布到 App Store。

---

## 三、更新 App

每次修改前端代码后，执行：

```bash
npm run build
npx cap sync
```

然后重新打开 Android Studio / Xcode 打包。

---

## 四、自定义应用图标

替换以下目录中的图片文件：

### Android 图标

```
android/app/src/main/res/
├── mipmap-mdpi/ic_launcher.png      (48x48)
├── mipmap-hdpi/ic_launcher.png      (72x72)
├── mipmap-xhdpi/ic_launcher.png     (96x96)
├── mipmap-xxhdpi/ic_launcher.png    (144x144)
└── mipmap-xxxhdpi/ic_launcher.png   (192x192)
```

### iOS 图标

```
ios/App/App/Assets.xcassets/AppIcon.appiconset/
```

推荐使用 [App Icon Generator](https://appicon.co/) 在线生成各尺寸图标。

---

## 五、常见问题

### Q: App 打开后白屏？

确保 `.env` 中配置了正确的后端地址：
```
VITE_API_URL=https://你的后端地址/api
```

### Q: 网络请求失败？

Android 9+ 默认禁止 HTTP 明文传输，确保后端使用 HTTPS。

### Q: 如何测试 App？

1. 用 USB 连接手机，开启开发者模式
2. 在 Android Studio 中点击 Run 按钮
3. 或直接安装 APK 到手机

---

## 项目结构

```
client/
├── android/           # Android 原生项目
├── ios/               # iOS 原生项目（需添加）
├── src/               # React 源码
├── dist/              # 构建产物
├── capacitor.config.ts
└── package.json
```
