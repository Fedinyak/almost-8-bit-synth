import { EFFECT_DEVICES } from '../../constants/soundParamsConfig';

const FAKE_LFO_DEFAULT_VALUE = 0;
const FAKE_LFO_INITIAL_FREQ_HZ = 5.0;
const FAKE_LFO_MAX_AMPLITUDE = 1.0;

const createParamStub = () => ({
  bypassed: true,
  wet: 0.0,
  set() {
    return this;
  },
  dispose() {},
});

const createFakeLfoNode = () => ({
  _param: { value: FAKE_LFO_DEFAULT_VALUE },
  frequency: { value: FAKE_LFO_INITIAL_FREQ_HZ },
  amplitude: { value: FAKE_LFO_MAX_AMPLITUDE },
  get value() {
    return FAKE_LFO_DEFAULT_VALUE;
  },
  set value(val) {},
  start() {},
  stop() {},
  connect() {},
  disconnect() {},
  dispose() {},
});

const createFakeLfoMeter = () => ({
  getValue: () => FAKE_LFO_DEFAULT_VALUE,
  dispose() {},
});

/**
 * Автоматически генерирует реестр заглушек эффектов на основе конфигурации девайсов
 */
export const buildVirtualHardwareRegistry = () => {
  const fxRegistry = {};
  const deviceKeys = Object.keys(EFFECT_DEVICES);
  const totalDevices = deviceKeys.length;

  for (let i = 0; i < totalDevices; i++) {
    const deviceConfig = EFFECT_DEVICES[deviceKeys[i]];
    if (deviceConfig.nodeKey) {
      fxRegistry[deviceConfig.nodeKey] = createParamStub();
    }
  }

  return fxRegistry;
};

/**
 * Собирает полный комплект виртуального обвязочного стейта (LFO, измерители)
 */
export const buildVirtualModulationStubs = () => ({
  masterLfo: createFakeLfoNode(),
  masterLfoMeter: createFakeLfoMeter(),
});
