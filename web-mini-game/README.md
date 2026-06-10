# Web Mini Game

一个最小可运行的网页小游戏项目。

## 项目说明

这是一个使用原生 HTML、CSS 和 JavaScript 编写的 Canvas 小游戏。

当前版本包含：

- 玩家移动
- 金币收集
- 敌人移动
- 分数统计
- 生命值
- 重新开始
- 图片资源加载

## 运行方式

1. 下载或克隆仓库。
2. 进入 `web-mini-game` 文件夹。
3. 直接用浏览器打开 `index.html`。

如果浏览器限制 ES Module 本地加载，可以用本地服务器启动：

```bash
python -m http.server 8000
```

然后打开：

```text
http://localhost:8000/web-mini-game/
```

## 操作方式

- `W A S D` 或方向键：移动玩家
- `R`：游戏结束后重新开始

## 资源目录

游戏图片放在：

```text
web-mini-game/assets/images/
```

当前使用的是 SVG 占位图。后续可以把生成的游戏原画放到这个目录，再修改 `src/assets.js` 中的路径。
