<template>
  <main class="min-h-screen bg-[#f5f7fb] px-4 py-10">
    <section class="mx-auto mt-8 w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <div class="mb-6 text-center">
        <div class="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-lg font-bold text-white">HR</div>
        <h1 class="text-xl font-bold text-slate-900">候选人登录</h1>
        <p class="mt-2 text-sm text-slate-500">请输入您投递简历时使用的邮箱获取验证码</p>
      </div>
      <el-form label-position="top" @submit.prevent="login">
        <el-form-item label="电子邮箱"><el-input v-model.trim="email" type="email" clearable placeholder="请输入邮箱"><template #prefix><el-icon><Message /></el-icon></template></el-input></el-form-item>
        <el-form-item label="验证码"><div class="flex w-full gap-3"><el-input v-model.trim="code" class="flex-1" maxlength="6" inputmode="numeric" placeholder="请输入 6 位验证码"><template #prefix><el-icon><Key /></el-icon></template></el-input><el-button class="w-32" :disabled="countdown > 0 || sending" :loading="sending" @click="sendCode">{{ countdown > 0 ? `${countdown}s` : '获取验证码' }}</el-button></div></el-form-item>
        <el-button class="mt-3 w-full" native-type="submit" type="primary" :loading="loading">登录</el-button>
      </el-form>
      <div class="mt-6 rounded-lg border border-blue-100 bg-blue-50/60 p-3.5 text-xs leading-5 text-blue-800"><p class="font-semibold">登录说明</p><ul class="mt-1 list-disc space-y-1 pl-4"><li>仅已投递职位的候选人可使用对应邮箱登录。</li><li>验证码 10 分钟内有效，同一邮箱 60 秒后可再次发送。</li><li>登录后仅可查看本人投递记录与沟通信息。</li></ul></div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Key, Message } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { candidatePortalTokenKey, sendCandidateLoginCode, verifyCandidateLoginCode } from '@/apis/candidate_portal_api'

const router = useRouter()
const email = ref('')
const code = ref('')
const sending = ref(false)
const loading = ref(false)
const countdown = ref(0)
let countdownTimer: number | undefined

const startCountdown = () => {
  countdown.value = 60
  countdownTimer = window.setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0 && countdownTimer) window.clearInterval(countdownTimer)
  }, 1000)
}
const sendCode = async () => {
  if (!/^\S+@\S+\.\S+$/.test(email.value)) return ElMessage.warning('请输入正确的邮箱地址')
  sending.value = true
  try { await sendCandidateLoginCode(email.value); startCountdown(); ElMessage.success('验证码已发送至您的邮箱，请注意查收') } catch (error: any) { ElMessage.error(error.response?.data?.detail || '验证码发送失败') } finally { sending.value = false }
}
const login = async () => {
  if (!/^\S+@\S+\.\S+$/.test(email.value)) return ElMessage.warning('请输入正确的邮箱地址')
  if (!/^\d{6}$/.test(code.value)) return ElMessage.warning('验证码为 6 位数字')
  loading.value = true
  try { const result = await verifyCandidateLoginCode(email.value, code.value); localStorage.setItem(candidatePortalTokenKey, result.access_token); localStorage.setItem('candidatePortalEmail', email.value); router.replace('/candidate-portal') } catch (error: any) { ElMessage.error(error.response?.data?.detail || '登录失败') } finally { loading.value = false }
}
onBeforeUnmount(() => { if (countdownTimer) window.clearInterval(countdownTimer) })
</script>
