let timerId = null;

export const schedulerTimer = {
  start(tickCallback, intervalMs) {
    if (timerId !== null) return;
    timerId = setInterval(tickCallback, intervalMs);
  },
  stop() {
    if (timerId === null) return;
    clearInterval(timerId);
    timerId = null;
  },
  isRunning() {
    return timerId !== null;
  },
};
