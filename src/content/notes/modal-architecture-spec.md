---
title: "Modal 架構規格設計"
description: "Vue 3 Modal 架構設計規範與實作指南。"
category: "前端開發"
tags: ["Vue 3", "Modal", "元件設計", "組件化"]
series: "admin-system"
seriesOrder: 8
publishDate: 2026-07-17
draft: false
---

版本：v1.0
定位：Vue 3 Modal 組件化設計規範與實作指南，針對 Modal 外殼、內容元件、父層調度、共用子元件等做說明。

---

# Vue 3 Modal 架構規格設計

## 1. 設計目標

- Modal 外殼(Shell)只負責「物理行為」：遮罩、開關動畫、定位、尺寸、ESC/點外部關閉、z-index。
- Modal 內容（表單欄位、驗證邏輯、footer 按鈕）完全交給各自的內容元件，透過 `slot` 組合進外殼。
- 全頁只用一個狀態控制「目前開啟哪個 modal」，避免每個 modal 各自維護 `isOpen`。
- 新增一種 modal 時，外殼元件**不需要修改**。

---

## 2. 元件分層

```
CommitteeInvitePage.vue          （頁面／父層）
 ├─ ModalShell.vue                （通用外殼，純展示邏輯）
 │   └─ <slot> / <slot name="footer">
 ├─ modals/AddMemberModal.vue     （內容：新增）
 ├─ modals/BatchImportModal.vue   （內容：批次匯入）
 ├─ modals/ConfirmDeleteModal.vue （內容：批次刪除）
 ├─ modals/SortEditorModal.vue    （內容：編輯排序）
 ├─ modals/UploadFormModal.vue    （內容：上傳調查表和同意書）
 ├─ modals/MailSettingModal.vue   （內容：批次信件發送設定）
 ├─ modals/ConfirmJoinModal.vue   （內容：批次確認參加）
 └─ modals/ExportModal.vue        （內容：匯出總表）
```

---

## 3. ModalShell 規格（外殼）

### 3.1 職責範圍（只做這些）

| 職責             | 說明                                        |
| ---------------- | ------------------------------------------- |
| 開關控制         | 依 `isOpen`（或 `modelValue`）決定顯示/隱藏 |
| 遮罩層           | overlay、點擊背景關閉（可選）               |
| 容器定位         | 置中、尺寸（sm / md / lg / full）           |
| 關閉行為         | ESC 鍵、右上角 × 按鈕                       |
| 標題列           | 顯示 `title`，不涉及內容邏輯                |
| body/footer 插槽 | 純粹讓內容元件塞內容，外殼不知道裡面是什麼  |

### 3.2 Props / Emits 介面

```ts
// ModalShell.vue - <script setup lang="ts">
interface Props {
  modelValue: boolean; // v-model 控制開關
  title?: string;
  size?: "sm" | "md" | "lg" | "full"; // 純樣式尺寸
  closeOnClickOutside?: boolean; // 預設 true
  closeOnEsc?: boolean; // 預設 true
  persistent?: boolean; // true 時不可點外部/ESC關閉（例如表單有未存內容）
}

const props = withDefaults(defineProps<Props>(), {
  size: "md",
  closeOnClickOutside: true,
  closeOnEsc: true,
  persistent: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  closed: []; // 動畫結束後觸發，方便做資源清理
}>();
```

### 3.3 Slots 規格

| Slot 名稱              | 用途                                      | 是否必要                  |
| ---------------------- | ----------------------------------------- | ------------------------- |
| `default`              | modal 主體內容（表單、確認文字、表格...） | 是                        |
| `footer`               | 按鈕列，由內容元件自行決定要放什麼按鈕    | 否（不塞則不顯示 footer） |
| `header-extra`（可選） | 標題列右側額外操作，如「說明」icon        | 否                        |

### 3.4 範例實作

```vue
<!-- ModalShell.vue -->
<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="modelValue"
        class="modal-overlay"
        @click.self="handleOverlayClick"
        @keydown.esc="handleEsc"
      >
        <div class="modal-box" :class="`modal-box--${size}`">
          <header class="modal-header">
            <span class="modal-title">{{ title }}</span>
            <slot name="header-extra" />
            <button class="modal-close" @click="close">×</button>
          </header>

          <section class="modal-body">
            <slot />
          </section>

          <footer v-if="$slots.footer" class="modal-footer">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
function close() {
  emit("update:modelValue", false);
}
function handleOverlayClick() {
  if (props.closeOnClickOutside && !props.persistent) close();
}
function handleEsc() {
  if (props.closeOnEsc && !props.persistent) close();
}
</script>
```

**重點：外殼裡面完全沒有 `v-if (type === 'add') ...` 這類判斷。**

---

## 4. 父層：Modal 調度規格

### 4.1 狀態設計

用單一 `activeModal` 狀態（字串或 null）決定目前開哪個，而不是 8 個 boolean。

```ts
// CommitteeInvitePage.vue - <script setup lang="ts">
type ModalType =
  | "add"
  | "batchImport"
  | "delete"
  | "sort"
  | "upload"
  | "mailSetting"
  | "confirmJoin"
  | "export"
  | null;

const activeModal = ref<ModalType>(null);
const modalPayload = ref<unknown>(null); // 傳給內容元件的資料，例如選取的列

function openModal(type: ModalType, payload?: unknown) {
  activeModal.value = type;
  modalPayload.value = payload ?? null;
}
function closeModal() {
  activeModal.value = null;
  modalPayload.value = null;
}
```

### 4.2 對應表（可選，用於統一管理標題與尺寸）

不把「內容元件」塞進 config（那樣在 template 動態渲染會變複雜且失去型別），而是保留 config 只管**外殼參數**，內容用 `<template v-if>` 各自掛載：

```ts
const modalMeta: Record<
  Exclude<ModalType, null>,
  { title: string; size: "sm" | "md" | "lg" | "full" }
> = {
  add: { title: "新增會員", size: "md" },
  batchImport: { title: "批次匯入", size: "md" },
  delete: { title: "確認刪除", size: "sm" },
  sort: { title: "編輯排序", size: "lg" },
  upload: { title: "上傳調查表和同意書", size: "md" },
  mailSetting: { title: "批次信件發送設定", size: "md" },
  confirmJoin: { title: "批次確認參加", size: "md" },
  export: { title: "匯出總表", size: "sm" },
};
```

### 4.3 Template（用 shell + 條件掛載內容元件）

```vue
<template>
  <button @click="openModal('add')">新增</button>
  <button @click="openModal('batchImport')">批次匯入</button>
  <button @click="openModal('delete')">批次刪除</button>
  <button @click="openModal('sort')">編輯排序</button>
  <button @click="openModal('upload')">上傳調查表和同意書</button>
  <button @click="openModal('mailSetting')">批次信件發送設定</button>
  <button @click="openModal('confirmJoin')">批次確認參加</button>
  <button @click="openModal('export')">匯出總表</button>

  <ModalShell
    :model-value="activeModal !== null"
    :title="activeModal ? modalMeta[activeModal].title : ''"
    :size="activeModal ? modalMeta[activeModal].size : 'md'"
    @update:model-value="(v) => !v && closeModal()"
  >
    <AddMemberModal
      v-if="activeModal === 'add'"
      @close="closeModal"
      @submit="onAdded"
    />
    <BatchImportModal
      v-if="activeModal === 'batchImport'"
      @close="closeModal"
      @submit="onImported"
    />
    <ConfirmDeleteModal
      v-if="activeModal === 'delete'"
      :payload="modalPayload"
      @close="closeModal"
      @confirm="onDeleted"
    />
    <SortEditorModal
      v-if="activeModal === 'sort'"
      :payload="modalPayload"
      @close="closeModal"
      @submit="onSorted"
    />
    <UploadFormModal
      v-if="activeModal === 'upload'"
      @close="closeModal"
      @submit="onUploaded"
    />
    <MailSettingModal
      v-if="activeModal === 'mailSetting'"
      @close="closeModal"
      @submit="onMailSet"
    />
    <ConfirmJoinModal
      v-if="activeModal === 'confirmJoin'"
      @close="closeModal"
      @confirm="onJoinConfirmed"
    />
    <ExportModal
      v-if="activeModal === 'export'"
      @close="closeModal"
      @submit="onExported"
    />
  </ModalShell>
</template>
```

> 註：內容元件會 render 到 `ModalShell` 的 `default` slot 裡；若內容元件內部有自己的 `<template #footer>`，需透過 `<slot>` 轉發（見 4.4）。

### 4.4 內容元件如何提供 footer（透過 slot 轉發）

因為內容元件是掛在 `ModalShell` 的 `default` slot 位置，若要讓內容元件也能定義 footer 按鈕，有兩種做法：

**做法 A（推薦，簡單場景）：footer 按鈕直接寫在內容元件內部，不透過 ModalShell 的 footer slot**

```vue
<!-- AddMemberModal.vue -->
<template>
  <div class="form-fields">...</div>
  <div class="modal-footer">
    <button @click="$emit('close')">取消</button>
    <button @click="handleSubmit">儲存</button>
  </div>
</template>
```

外殼的 `footer` slot 就不用，簡單直接，多數情境夠用。

**做法 B（進階，需要 footer 樣式與 body 明確分離時）：用 Vue 3.3+ 的具名 slot 透傳**

```vue
<!-- 父層 -->
<ModalShell v-model="isOpen" :title="...">
  <AddMemberModal ref="contentRef" />
  <template #footer>
    <button @click="contentRef?.submit()">儲存</button>
  </template>
</ModalShell>
```

這種做法讓父層拿到內容元件的方法（透過 `defineExpose`），footer 按鈕邏輯留在父層呼叫。適合 footer 按鈕行為（loading、disabled）需要跟外殼共同管理狀態的情況。

> 建議：**先用做法 A**，除非同一批 modal 的 footer 樣式高度一致、需要外殼統一渲染，才升級成做法 B。

---

## 5. 內容元件規格（統一介面）

所有內容元件遵守相同的 emit 慣例，方便父層一致處理：

```ts
// 通用 emits 慣例
defineEmits<{
  close: []; // 使用者取消/關閉
  submit: [payload: unknown]; // 表單類：送出成功
  confirm: []; // 確認類：如刪除、確認參加
}>();

// 通用 props 慣例（如需要外部資料）
defineProps<{
  payload?: unknown; // 例如：要刪除的列、要排序的清單
}>();
```

依內容型態分三種 pattern，各自照這個介面實作：

| 類型       | 範例                                       | 特徵                                             |
| ---------- | ------------------------------------------ | ------------------------------------------------ |
| 表單類     | 新增、上傳調查表和同意書、批次信件發送設定 | 有欄位驗證、`submit` 帶 payload                  |
| 確認類     | 批次刪除、批次確認參加                     | 只有一段文字 + `confirm`                         |
| 檔案類     | 批次匯入、匯出總表                         | 可共用 `<FileTransferPanel>` 子元件（見第 6 節） |
| 特殊版面類 | 編輯排序                                   | 內容是表格/拖拉排序，size 用 `lg`                |

---

## 6. 可複用的「內容層」子元件（非外殼）

檔案類的批次匯入／匯出總表功能不同（上傳 vs 下載），但都圍繞「檔案 + 進度」，可以抽共用元件，注意這是**內容層**的複用，跟 ModalShell 無關：

```vue
<!-- FileTransferPanel.vue -->
<script setup lang="ts">
defineProps<{
  mode: "upload" | "download";
  accept?: string; // upload 用
  fileName?: string; // download 用
}>();
defineEmits<{
  "file-selected": [file: File];
  "download-click": [];
}>();
</script>
```

`BatchImportModal.vue` 和 `ExportModal.vue` 內部各自使用 `<FileTransferPanel mode="upload" />` / `mode="download"`，處理各自的 API 呼叫邏輯。

---

## 7. 判斷準則（何時獨立、何時共用）

| 情境                                      | 處理方式                                               |
| ----------------------------------------- | ------------------------------------------------------ |
| 只是遮罩/開關/尺寸/定位不同               | 共用 `ModalShell`，用 `size` prop                      |
| 表單欄位、驗證邏輯不同                    | 各自獨立內容元件，共用外殼                             |
| footer 按鈕組合不同（1顆/2顆/danger樣式） | 內容元件自行畫 footer（做法 A）                        |
| 需要不可點外部關閉（有未存資料）          | 外殼加 `persistent` prop，不是加 if/else               |
| 需要巢狀 modal、全螢幕、特殊關閉規則      | 該功能不透過共用外殼，直接獨立整組 modal               |
| 兩個功能都是「檔案處理」但方向不同        | 內容層抽共用子元件（如 `FileTransferPanel`），不動外殼 |

---

## 8. 檔案結構建議

```
src/
 ├─ components/
 │   └─ common/
 │       └─ ModalShell.vue
 └─ views/CommitteeInvite/
     ├─ CommitteeInvitePage.vue
     ├─ composables/
     │   └─ useModalController.ts   （可選：把 activeModal/openModal 邏輯抽出）
     └─ modals/
         ├─ AddMemberModal.vue
         ├─ BatchImportModal.vue
         ├─ ConfirmDeleteModal.vue
         ├─ SortEditorModal.vue
         ├─ UploadFormModal.vue
         ├─ MailSettingModal.vue
         ├─ ConfirmJoinModal.vue
         ├─ ExportModal.vue
         └─ shared/
             └─ FileTransferPanel.vue
```

### 8.1 useModalController（可選抽出，讓頁面元件更乾淨）

```ts
// composables/useModalController.ts
import { ref } from "vue";

export function useModalController<T extends string>() {
  const activeModal = ref<T | null>(null);
  const payload = ref<unknown>(null);

  function open(type: T, data?: unknown) {
    activeModal.value = type;
    payload.value = data ?? null;
  }
  function close() {
    activeModal.value = null;
    payload.value = null;
  }
  return { activeModal, payload, open, close };
}
```

---

## 9. 總結原則

1. **外殼（ModalShell）只管「怎麼開」**：開關、遮罩、定位、尺寸、關閉方式，永遠不因新增功能而修改。
2. **父層只管「開哪個」**：用單一 `activeModal` 狀態 + `v-if` 掛載對應內容元件，不在外殼內做分類判斷。
3. **內容元件各自負責「裡面長什麼樣」**：表單、驗證、footer 按鈕都在內容元件內部完成，遵守統一的 emit 介面（`close` / `submit` / `confirm`）方便父層一致處理。
4. **內容層的複用（如檔案上傳/下載共用面板）跟外殼無關**，屬於另一層的元件拆分，不要混進 ModalShell。
