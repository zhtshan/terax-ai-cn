# 修复：chat 画面模型选择列表仅显示可用的模型

## 问题描述

chat 画面的模型下拉列表中，会显示所有 provider 的所有模型，包括尚未配置 API key 的云端 provider（如 OpenAI、Anthropic 等）。
虽然无 key 的模型会显示为灰色且有 "配置" 提示，但用户仍可点击，造成困惑。

## 根因

`src/modules/ai/components/AiStatusBarControls.tsx` 中的 `filtered` memo 缺少对"未配置 key 的 provider 模型"的过滤。
当前只在 UI 层面做视觉弱化（`hasKey` prop 控制颜色和点击跳转），未在数据层过滤。

## 修复目标

在 `filtered` 的 pool 计算中，直接排除无 key 的 provider 模型（keyless providers 如 Ollama/LM Studio/MLX 不受影响）。

## 影响范围

- 仅修改 1 个文件：`src/modules/ai/components/AiStatusBarControls.tsx`
- 不改变数据结构，不改变 API
