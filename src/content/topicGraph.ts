/**
 * 筆記主題關聯圖資料
 *
 * 手動維護：新增筆記時，需自行在 notes / edges 補上對應節點與關聯。
 * 座標位置由跨層延伸 layout 演算法自動計算。
 */

export interface TopicNode {
  id: string;
  /** 對應 src/content/notes/{slug}.md */
  slug: string;
  title: string;
  category: string;
  seriesOrder?: number;
}

export type RelationType =
  | "dependency" // 依賴
  | "extension" // 延伸
  | "alternative" // 替代方案
  | "tool" // 相關工具
  | "cross-layer" // 跨層延伸
  | "shared-dep" // 相依套件
  | "contrast" // 情境對比
  | "toolchain"; // 工具鏈延伸

export const relationLabels: Record<RelationType, string> = {
  dependency: "依賴",
  extension: "延伸",
  alternative: "替代方案",
  tool: "相關工具",
  "cross-layer": "跨層延伸",
  "shared-dep": "相依套件",
  contrast: "情境對比",
  toolchain: "工具鏈延伸",
};

export interface TopicEdge {
  id: string;
  source: string;
  target: string;
  relation: RelationType;
  /** 手動指定錨點側邊，讓連線走向不互相交疊 */
  sourceHandle: "top" | "right" | "bottom" | "left";
  targetHandle: "top" | "right" | "bottom" | "left";
}

export const topicNodes: TopicNode[] = [
  {
    id: "architecture",
    slug: "admin-system-architecture",
    title: "① 系統架構規格",
    category: "Vue3/React・JWT・RBAC",
    seriesOrder: 1,
  },
  {
    id: "practical-issues",
    slug: "admin-system-practical-issues",
    title: "② 實務踩坑",
    category: "Token 刷新・RBAC 即時生效",
    seriesOrder: 2,
  },
  {
    id: "cicd",
    slug: "admin-system-cicd",
    title: "③ CI/CD 部署架構",
    category: "Docker・K8s・GitHub Actions",
    seriesOrder: 3,
  },
  {
    id: "nginx",
    slug: "admin-system-nginx",
    title: "④ Nginx 自架部署",
    category: "Symlink・HTTPS",
    seriesOrder: 4,
  },
  {
    id: "design-system",
    slug: "design-system-spec",
    title: "⑤ 設計系統規格",
    category: "Tailwind CSS・shadcn/ui",
    seriesOrder: 5,
  },
  {
    id: "editing-feature",
    slug: "editing-feature-rollout-plan",
    title: "⑥ 線上編輯功能",
    category: "Supabase・Tiptap",
    seriesOrder: 6,
  },
  {
    id: "playwright-cli",
    slug: "playwright-cli-intro",
    title: "⑦ playwright-cli 指南",
    category: "AI 開發工具",
    seriesOrder: 7,
  },
];

export const topicEdges: TopicEdge[] = [
  {
    id: "e-arch-issues",
    source: "architecture",
    target: "practical-issues",
    relation: "dependency",
    sourceHandle: "right",
    targetHandle: "left",
  },
  {
    id: "e-issues-cicd",
    source: "practical-issues",
    target: "cicd",
    relation: "dependency",
    sourceHandle: "right",
    targetHandle: "left",
  },
  {
    id: "e-arch-cicd",
    source: "architecture",
    target: "cicd",
    relation: "dependency",
    sourceHandle: "bottom",
    targetHandle: "top",
  },
  {
    id: "e-cicd-nginx",
    source: "cicd",
    target: "nginx",
    relation: "alternative",
    sourceHandle: "right",
    targetHandle: "left",
  },
  {
    id: "e-nginx-issues",
    source: "nginx",
    target: "practical-issues",
    relation: "tool",
    sourceHandle: "top",
    targetHandle: "top",
  },
  {
    id: "e-design-editing",
    source: "design-system",
    target: "editing-feature",
    relation: "shared-dep",
    sourceHandle: "right",
    targetHandle: "left",
  },
  {
    id: "e-nginx-editing",
    source: "nginx",
    target: "editing-feature",
    relation: "contrast",
    sourceHandle: "bottom",
    targetHandle: "top",
  },
  {
    id: "e-editing-playwright",
    source: "editing-feature",
    target: "playwright-cli",
    relation: "toolchain",
    sourceHandle: "right",
    targetHandle: "left",
  },
  {
    id: "e-issues-editing",
    source: "practical-issues",
    target: "editing-feature",
    relation: "extension",
    sourceHandle: "bottom",
    targetHandle: "top",
  },
];
