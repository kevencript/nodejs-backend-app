/**
 * utilitarios/groupBy.js
 *
 * @description: Função para agrupar itens de um array que contenham uma chave em comum
 *
 */

// Essa função tem como dever retornar os itens que contenham a chave
exports.groupBy = async (list, keyGetter) => {
  const map = await new Map();
  await Promise.all([
    list.forEach(item => {
      const key = keyGetter(item);
      const collection = map.get(key);
      if (!collection) {
        map.set(key, [item]);
      } else {
        collection.push(item);
      }
    })
  ]);
  return map;
};
