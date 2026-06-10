import { imageSources, loadImages } from "./assets.js";
import { createGame, registerControls } from "./game.js";

const canvas = document.querySelector("#gameCanvas");
const restartButton = document.querySelector("#restartButton");

async function start() {
  try {
    const images = await loadImages(imageSources);
    registerControls(restartButton);
    createGame(canvas, images);
  } catch (error) {
    console.error(error);
    const context = canvas.getContext("2d");
    context.fillStyle = "#0f172a";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#f87171";
    context.font = "22px Arial";
    context.fillText("游戏资源加载失败，请检查 assets/images 目录。", 40, 240);
  }
}

start();
