const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("todoApi", {
  getState: () => ipcRenderer.invoke("todo:getState"),
  getTasks: (listId) => ipcRenderer.invoke("todo:getTasks", listId),
  addList: (name) => ipcRenderer.invoke("todo:addList", name),
  renameList: (id, name) => ipcRenderer.invoke("todo:renameList", id, name),
  deleteList: (id) => ipcRenderer.invoke("todo:deleteList", id),
  addTask: (listId) => ipcRenderer.invoke("todo:addTask", listId),
  updateTask: (id, fields) => ipcRenderer.invoke("todo:updateTask", id, fields),
  deleteTask: (id) => ipcRenderer.invoke("todo:deleteTask", id),
  reorder: (listId, ids) => ipcRenderer.invoke("todo:reorder", listId, ids),
  stashTask: (id, stashed) => ipcRenderer.invoke("todo:stashTask", id, stashed)
});
