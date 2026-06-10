export const imageSources = {
  player: "./assets/images/player.svg",
  gem: "./assets/images/gem.svg",
  enemy: "./assets/images/enemy.svg"
};

export function loadImages(sources) {
  const entries = Object.entries(sources);

  return Promise.all(
    entries.map(([name, src]) => {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve([name, image]);
        image.onerror = () => reject(new Error(`图片加载失败：${src}`));
        image.src = src;
      });
    })
  ).then((loadedEntries) => Object.fromEntries(loadedEntries));
}
