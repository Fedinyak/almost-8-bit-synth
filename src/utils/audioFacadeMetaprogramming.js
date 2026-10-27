/**
 * Создает неизменяемое свойство только для чтения на целевом объекте
 */
export const defineReadOnlyProperty = (target, propertyName, getterFn) => {
  Object.defineProperty(target, propertyName, {
    get: getterFn,
    configurable: true,
  });
};

/**
 * Создает совместимое с Tone.js value-прокси свойство (.value)
 */
export const defineProxyValueProperty = (
  target,
  propertyName,
  sourceObj,
  getMethod,
  setMethod,
) => {
  Object.defineProperty(target, propertyName, {
    get: () => ({
      get value() {
        return sourceObj[getMethod]();
      },
      set value(val) {
        sourceObj[setMethod](val);
      },
    }),
    configurable: true,
  });
};

/**
 * Строит вложенную proxy-структуру на основе переданной конфигурационной карты
 */
export const buildNestedProxyNode = (rack, definitionMap) => {
  const node = {};
  const fields = Object.keys(definitionMap);
  const totalFields = fields.length;

  for (let i = 0; i < totalFields; i++) {
    const subProperty = fields[i];
    const accessors = definitionMap[subProperty];

    Object.defineProperty(node, subProperty, {
      get: () => rack[accessors.get](),
      set: (val) => {
        rack[accessors.set](val);
      },
      configurable: true,
    });
  }

  return node;
};

/**
 * Переводит плоский словарь методов в рантайм-акцессоры на объекте
 */
export const executeCoreAccessorsInjection = (
  rack,
  sourceObj,
  accessorsMap,
) => {
  const keys = Object.keys(accessorsMap);
  const totalKeys = keys.length;

  for (let i = 0; i < totalKeys; i++) {
    const paramKey = keys[i];
    const config = accessorsMap[paramKey];

    rack[config.get] = () => sourceObj[config.get]();
    rack[config.set] = (val) => {
      sourceObj[config.set](val);
    };
  }
};
