export async function renameKeys(msg, config) {
  const mapping = config.mapping || {};
  const newMsg = { ...msg, msg: { ...msg.msg } };
  for (const [oldKey, newKey] of Object.entries(mapping)) {
    if (newMsg.msg[oldKey] !== undefined) {
      newMsg.msg[newKey] = newMsg.msg[oldKey];
      delete newMsg.msg[oldKey];
    }
  }
  return { success: true, msg: newMsg };
}
