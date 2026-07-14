<template>
  <div class="page-shell">
    <section class="surface" v-loading="loading">
      <div class="surface-header">
        <div>
          <div class="surface-title">权限配置</div>
          <div class="surface-subtitle">按业务模块查看和配置角色可以执行的操作</div>
        </div>
        <el-button size="small" plain @click="router.push('/iam/roles')">返回角色列表</el-button>
      </div>
      <div v-if="roleTree" class="space-y-5 p-5">
        <section v-for="module in roleTree.modules" :key="module.name" class="rounded-lg border border-slate-200 p-4">
          <div class="mb-3 flex items-center justify-between gap-3">
            <h2 class="text-sm font-semibold text-slate-900">{{ module.name }}</h2>
            <el-checkbox
              v-if="isEdit"
              :model-value="isModuleFullySelected(module)"
              :indeterminate="isModulePartiallySelected(module)"
              @change="toggleModule(module, Boolean($event))"
            >全部选择</el-checkbox>
          </div>
          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <label v-for="permission in module.permissions" :key="permission.id" class="flex gap-2 rounded-md border border-slate-100 p-3" :class="isEdit ? 'cursor-pointer hover:border-blue-200' : 'bg-slate-50'">
              <el-checkbox v-model="selectedPermissionIds" :label="permission.id" :disabled="!isEdit" />
              <span>
                <span class="block text-sm font-medium text-slate-800">{{ permission.name }}</span>
                <span v-if="permission.description" class="mt-1 block text-xs leading-5 text-slate-500">{{ permission.description }}</span>
              </span>
            </label>
          </div>
        </section>

        <template v-if="isEdit">
          <el-form label-position="top" class="max-w-2xl">
            <el-form-item label="变更原因" required>
              <el-input v-model="reason" type="textarea" :rows="3" maxlength="255" show-word-limit placeholder="请说明本次权限调整的业务原因" />
            </el-form-item>
          </el-form>
          <div class="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <el-button @click="router.push('/iam/roles')">取消</el-button>
            <el-button type="primary" :loading="saving" @click="save">保存权限配置</el-button>
          </div>
        </template>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { getRolePermissions, updateRolePermissions, type RolePermissionModule, type RolePermissionTree } from '@/apis/iam_api'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const roleTree = ref<RolePermissionTree | null>(null)
const selectedPermissionIds = ref<string[]>([])
const reason = ref('')
const roleId = computed(() => String(route.params.roleId))
const isEdit = computed(() => route.name === 'iam-role-permissions-edit')

const load = async () => {
  loading.value = true
  try {
    roleTree.value = await getRolePermissions(roleId.value)
    selectedPermissionIds.value = roleTree.value.modules.flatMap((module) => module.permissions.filter((item) => item.checked).map((item) => item.id))
  } catch {
    ElMessage.error('角色权限加载失败')
  } finally {
    loading.value = false
  }
}

const isModuleFullySelected = (module: RolePermissionModule) => module.permissions.length > 0 && module.permissions.every((item) => selectedPermissionIds.value.includes(item.id))
const isModulePartiallySelected = (module: RolePermissionModule) => !isModuleFullySelected(module) && module.permissions.some((item) => selectedPermissionIds.value.includes(item.id))
const toggleModule = (module: RolePermissionModule, checked: boolean) => {
  const ids = new Set(selectedPermissionIds.value)
  module.permissions.forEach((item) => checked ? ids.add(item.id) : ids.delete(item.id))
  selectedPermissionIds.value = [...ids]
}

const save = async () => {
  if (!reason.value.trim()) return ElMessage.warning('请填写变更原因')
  try {
    await ElMessageBox.confirm('保存后，当前拥有该角色的用户需要重新获取权限状态。是否继续？', '确认编辑权限', { type: 'warning', confirmButtonText: '确认保存', cancelButtonText: '取消' })
    saving.value = true
    roleTree.value = await updateRolePermissions(roleId.value, { permission_ids: selectedPermissionIds.value, reason: reason.value.trim() })
    ElMessage.success('角色权限已更新')
    router.push('/iam/roles')
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error('角色权限保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => { void load() })
</script>
