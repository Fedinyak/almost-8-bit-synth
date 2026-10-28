const activeTimers = new Map();
const lastPendingValues = new Map();

const DEFAULT_THROTTLE_MS = 40;

export const throttleReduxDispatch = (
  key,
  actionDispatcher,
  value,
  delayMs = DEFAULT_THROTTLE_MS,
) => {
  lastPendingValues.set(key, value);

  if (activeTimers.has(key)) {
    return;
  }

  actionDispatcher(value);

  const timerId = setInterval(() => {
    const lastValue = lastPendingValues.get(key);

    if (lastValue !== undefined) {
      actionDispatcher(lastValue);
      lastPendingValues.delete(key);
    } else {
      const currentTimer = activeTimers.get(key);
      if (currentTimer) {
        clearInterval(currentTimer);
      }
      activeTimers.delete(key);
    }
  }, delayMs);

  activeTimers.set(key, timerId);
};

export const flushReduxDispatch = (key, actionDispatcher) => {
  const currentTimer = activeTimers.get(key);
  if (currentTimer) {
    clearInterval(currentTimer);
    activeTimers.delete(key);
  }

  const lastValue = lastPendingValues.get(key);
  if (lastValue !== undefined) {
    actionDispatcher(lastValue);
    lastPendingValues.delete(key);
  }
};
