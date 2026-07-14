<template>
  <div class="page-shell">
    <div class="flex justify-end">
      <el-button plain @click="router.push('/iam')">返回组织与用户</el-button>
    </div>

    <section class="surface overflow-hidden" v-loading="loading">
      <div class="surface-header">
        <div>
          <div class="surface-title">角色列表</div>
          <div class="surface-subtitle">在操作中查看或调整角色可用能力</div>
        </div>
      </div>
      <el-table :data="roles" empty-text="暂无角色" class="w-full">
        <el-table-column prop="name" label="角色名称" min-width="170" />
        <el-table-column prop="description" label="角色说明" min-width="280" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default><el-tag type="success" effect="light">启用</el-tag></template>
        </el-table-column>
        <el-table-column label="操作" width="190" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="viewPermissions(row.id)">查看权限</el-button>
            <el-button v-if="can('role.update_permissions')" link type="primary" @click="editPermissions(row.id)">编辑权限</el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { getIamRoles, type IamRole } from '@/apis/iam_api'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const store = useUserStore()
const can = store.can
const loading = ref(false)
const roles = ref<IamRole[]>([])

const load = async () => {
  loading.value = true
  try {
    roles.value = await getIamRoles()
  } catch {
    ElMessage.error('角色列表加载失败')
  } finally {
    loading.value = false
  }
}

const viewPermissions = (roleId: string) => router.push(`/iam/roles/${roleId}/permissions`)
const editPermissions = (roleId: string) => router.push(`/iam/roles/${roleId}/permissions/edit`)

onMounted(() => { void load() })
</script>
