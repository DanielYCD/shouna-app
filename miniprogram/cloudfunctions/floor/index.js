// 户型图云函数：列表 / 新增 / 改名 / 删除 / 取标记 / 设置标记
// 标记即物品在户型图上的位置，存于 items.location { floorId, x, y }
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

async function isMember(familyId, openid) {
  const r = await db.collection('family_members').where({ familyId, openid }).get()
  return r.data.length > 0
}

const COLLECTIONS = ['profiles', 'families', 'family_members', 'items', 'floors']
async function ensureCollections() {
  for (const name of COLLECTIONS) {
    try { await db.createCollection(name) } catch (e) { /* 已存在则忽略 */ }
  }
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { success: false, error: '缺少身份信息' }
  const { action } = event
  try {
    await ensureCollections()
    if (action === 'list') {
      const { familyId } = event
      if (!await isMember(familyId, OPENID)) return { success: false, error: '无权限' }
      const r = await db.collection('floors').where({ familyId }).orderBy('createdAt', 'asc').get()
      return { success: true, floors: r.data }
    }

    if (action === 'add') {
      const { familyId, name, imageFileId } = event
      if (!await isMember(familyId, OPENID)) return { success: false, error: '无权限' }
      const r = await db.collection('floors').add({
        data: {
          familyId,
          name: (name || '楼层').toString().slice(0, 20) || '楼层',
          imageFileId: imageFileId || '',
          createdAt: db.serverDate()
        }
      })
      return { success: true, _id: r._id }
    }

    if (action === 'rename') {
      const { familyId, floorId, name } = event
      if (!await isMember(familyId, OPENID)) return { success: false, error: '无权限' }
      await db.collection('floors').doc(floorId).update({ data: { name: name.toString().slice(0, 20) } })
      return { success: true }
    }

    if (action === 'del') {
      const { familyId, floorId } = event
      if (!await isMember(familyId, OPENID)) return { success: false, error: '无权限' }
      // 清除引用该楼层的标记
      await db.collection('items').where({ familyId, 'location.floorId': floorId })
        .update({ data: { location: db.command.remove() } })
      await db.collection('floors').doc(floorId).remove()
      return { success: true }
    }

    if (action === 'markers') {
      const { familyId, floorId } = event
      if (!await isMember(familyId, OPENID)) return { success: false, error: '无权限' }
      const r = await db.collection('items').where({ familyId, 'location.floorId': floorId }).get()
      return { success: true, markers: r.data }
    }

    if (action === 'setMarker') {
      const { familyId, itemId, floorId, x, y } = event
      if (!await isMember(familyId, OPENID)) return { success: false, error: '无权限' }
      if (floorId == null) {
        await db.collection('items').doc(itemId).update({ data: { location: db.command.remove() } })
      } else {
        await db.collection('items').doc(itemId).update({
          data: { location: { floorId, x: x || 0, y: y || 0 } }
        })
      }
      return { success: true }
    }

    return { success: false, error: '未知操作' }
  } catch (e) {
    return { success: false, error: e.message || String(e) }
  }
}
