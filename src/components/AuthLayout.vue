<template>
  <div class="grid min-h-screen bg-[#f5f7fb] lg:grid-cols-[1.05fr_0.95fr]">
    <section
      class="hidden border-r border-slate-200 bg-[#111827] px-10 py-10 text-white lg:flex lg:flex-col"
    >
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500">
          <el-icon size="21"><Briefcase /></el-icon>
        </div>
        <div>
          <div class="text-base font-semibold">AI智能招聘系统</div>
          <div class="text-xs text-slate-400">Talent Workspace</div>
        </div>
      </div>

      <div class="flex flex-1 items-center">
        <div class="max-w-xl">
          <div
            class="inline-flex rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-300"
          >
            智能招聘工作台
          </div>
          <h1 class="mt-6 text-4xl font-semibold leading-tight text-balance">
            让职位、候选人和 AI 分析在同一个节奏里流动
          </h1>
          <p class="mt-5 max-w-lg text-base leading-7 text-slate-300">
            从简历解析、候选人跟进到招聘助手检索，团队可以在统一界面里完成核心招聘流程。
          </p>

          <div class="mt-8 grid max-w-lg grid-cols-3 gap-3">
            <div class="rounded-lg border border-white/10 bg-white/5 p-4">
              <div class="text-2xl font-semibold">7D</div>
              <div class="mt-1 text-xs text-slate-400">趋势追踪</div>
            </div>
            <div class="rounded-lg border border-white/10 bg-white/5 p-4">
              <div class="text-2xl font-semibold">AI</div>
              <div class="mt-1 text-xs text-slate-400">候选人分析</div>
            </div>
            <div class="rounded-lg border border-white/10 bg-white/5 p-4">
              <div class="text-2xl font-semibold">HR</div>
              <div class="mt-1 text-xs text-slate-400">协同管理</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <main class="flex min-h-screen items-center justify-center px-6 py-10">
      <div class="w-full max-w-[430px]">
        <div class="mb-8 lg:hidden">
          <div class="flex items-center justify-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white"
            >
              <el-icon size="21"><Briefcase /></el-icon>
            </div>
            <div class="text-lg font-semibold text-slate-950">AI智能招聘系统</div>
          </div>
        </div>

        <div class="surface p-8">
          <div class="mb-7">
            <h2 class="text-2xl font-semibold text-slate-950">{{ title }}</h2>
            <p v-if="subtitle" class="mt-2 text-sm leading-6 text-slate-500">
              {{ subtitle }}
            </p>
          </div>
          <slot></slot>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { Briefcase } from '@element-plus/icons-vue'

interface Props {
  title: string
  subtitle?: string
}

defineProps<Props>()
</script>
