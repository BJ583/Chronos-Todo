# ToDoList Electron

用于管理待办事项的 Windows 桌面应用，使用 SQLite 在本地保存清单和任务。

## 下载和使用

从源码构建 Windows x64 便携版后，双击 `ToDoList_Electron.exe` 启动。首次启动会创建一个空的默认清单。任务保存在程序同目录的 `todo_data.sqlite3` 中，备份任务时请复制这个文件。

## 功能

- 创建、重命名和删除清单。
- 编辑任务的截止时间、预计耗时、备注和标签。
- 拖拽排序，将任务标记为完成，或把任务暂存后恢复。

## 从源码运行

```sh
pnpm install --frozen-lockfile
pnpm dev
```

保持开发服务器运行，在另一个终端执行：

```sh
pnpm electron:dev
```

在 Windows 上运行 `pnpm run dist` 可构建 x64 便携版，产物为 `dist/ToDoList_Electron.exe`。
