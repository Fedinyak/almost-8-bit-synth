import createSynth from '../engines/synthEngine';
import createDrums from '../engines/drumEngine';

// Постоянный список инструментов твоего грувбокса
const SYNTH_NAMES = ['synth1', 'synth2'];

// Легковесные JS-пустышки, которые «проглатывают» команды слайдеров из Redux/UI
const createEffectStub = () => ({
  bypassed: true,
  wet: 0.0,
  set() {
    return this;
  },
  dispose() {},
});

/**
 * БЕССМЕРТНОЕ АУДИО-ЯДРО (АНАЛОГ ГЛОБАЛЬНОЙ ПАМЯТИ)
 * Ноды создаются строго ОДИН РАЗ при первом обращении.
 * Им абсолютно плевать на re-render, unmount или очистку рефов в React.
 */
class NativeEngineRegistry {
  constructor() {
    this._synths = {};
    this._drums = null;
    this._isInitialized = false;
  }

  ensureInitialized() {
    if (this._isInitialized) return;

    console.warn(
      '[🎹 NATIVE CORE]: Создание бессмертных нативных аудио-инстансов...',
    );

    // 1. Инициализируем синты один раз в жизни
    SYNTH_NAMES.forEach((name) => {
      const synthInstance = createSynth(name);

      // Маскируем инстанс пустышками, чтобы слайдеры интерфейса не падали с ошибкой "undefined"
      synthInstance.fxSaturator = createEffectStub();
      synthInstance.fxBitcrusher = createEffectStub();
      synthInstance.fxDistortion = createEffectStub();

      this._synths[name] = synthInstance;
    });

    // 2. Инициализируем барабаны один раз в жизни
    this._drums = createDrums();

    this._isInitialized = true;
    console.warn(
      '[🎯 NATIVE CORE]: Звуковой поток успешно изолирован в глобальной JS-памяти.',
    );
  }

  get synths() {
    this.ensureInitialized();
    return this._synths;
  }

  get drums() {
    this.ensureInitialized();
    return this._drums;
  }

  /**
   * Тотальный сброс памяти — сработает только если пользователь реально закроет вкладку
   */
  forceDisposeAll() {
    console.error('[🧹 NATIVE CORE GC]: Выгрузка нод из оперативной памяти...');

    Object.values(this._synths).forEach((synth) => {
      if (synth && typeof synth.dispose === 'function') synth.dispose();
    });

    if (this._drums && typeof this._drums.dispose === 'function') {
      this._drums.dispose();
    }

    this._synths = {};
    this._drums = null;
    this._isInitialized = false;
  }
}

// Экспортируем синглтон — единый неизменяемый аудио-проводник приложения
export const audioCore = new NativeEngineRegistry();
