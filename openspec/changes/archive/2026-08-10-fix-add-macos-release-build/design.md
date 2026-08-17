## 修复方案

在 `.github/workflows/release.yml` 的 matrix.include 中增加一行：

```yaml
- platform: macos-latest
  args: ""
  rust-target: ""
```

tauri-action@v1 在 macOS 上会自动构建 .dmg 和 .app 产物，无需额外的系统依赖安装（macOS runner 已预装 WebKitGTK 等所需库）。无需 macOS 代码签名 secrets 即可生成未签名的 release 产物，用户可在"系统设置→隐私与安全性"中手动信任。

## 根因

release workflow 的 matrix 最初只配置了 Linux 和 Windows，macOS 平台被遗漏。
