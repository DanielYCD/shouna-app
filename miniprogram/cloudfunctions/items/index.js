// 物品云函数：列表(搜索/分类筛选/分页) / 新增 / 修改 / 删除 / 详情
// 所有操作服务端校验家庭成员关系
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
      const { familyId, category, keyword, skip = 0, limit = 30 } = event
      if (!await isMember(familyId, OPENID)) return { success: false, error: '无权限' }
      const w = { familyId }
      if (category && category !== 'all') w.category = category
      if (keyword) w.name = db.RegExp({ regexp: keyword, options: 'i' })
      const countRes = await db.collection('items').where(w).count()
      const res = await db.collection('items').where(w)
        .orderBy('updatedAt', 'desc')
        .skip(skip).limit(limit).get()
      return { success: true, items: res.data, total: countRes.total }
    }

    if (action === 'add') {
      const { familyId, item } = event
      if (!await isMember(familyId, OPENID)) return { success: false, error: '无权限' }
      const data = Object.assign({}, item, {
        familyId,
        createdBy: OPENID,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      })
      const r = await db.collection('items').add({ data })
      return { success: true, _id: r._id }
    }

    if (action === 'update') {
      const { familyId, itemId, item } = event
      if (!await isMember(familyId, OPENID)) return { success: false, error: '无权限' }
      const data = Object.assign({}, item, { updatedAt: db.serverDate() })
      await db.collection('items').doc(itemId).update({ data })
      return { success: true }
    }

    if (action === 'del') {
      const { familyId, itemId } = event
      if (!await isMember(familyId, OPENID)) return { success: false, error: '无权限' }
      await db.collection('items').doc(itemId).remove()
      return { success: true }
    }

    if (action === 'detail') {
      const { familyId, itemId } = event
      if (!await isMember(familyId, OPENID)) return { success: false, error: '无权限' }
      const r = await db.collection('items').doc(itemId).get()
      return { success: true, item: r.data }
    }

    return { success: false, error: '未知操作' }
  } catch (e) {
    return { success: false, error: e.message || String(e) }
  }
}
