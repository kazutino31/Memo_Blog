import { api } from "@/api/client";

export interface ApiPost {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  author: {
    id: number;
    name: string;
  };
  tags: Array<{
    tag: {
      id: number;
      name: string;
    };
  }>;
}

interface PostsResponse {
  data: ApiPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface PostResponse {
  data: ApiPost;
}

export interface CreatePostPayload {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  published: boolean;
  tagNames: string[];
}

export type UpdatePostPayload = CreatePostPayload;

export async function getPosts() {
  const response = await api.get<PostsResponse>("/posts?limit=100");
  return response.data.filter((post) => post.published);
}

export async function createPost(payload: CreatePostPayload, token: string) {
  const response = await api.post<PostResponse>("/posts", payload, { token });
  return response.data;
}

export async function getAdminPosts(token: string) {
  const response = await api.get<PostsResponse>("/posts/manage", { token });
  return response.data;
}

export async function getManagedPost(id: number, token: string) {
  const response = await api.get<PostResponse>(`/posts/manage/${id}`, {
    token,
  });
  return response.data;
}

export async function updatePost(
  id: number,
  payload: UpdatePostPayload,
  token: string,
) {
  const response = await api.patch<PostResponse>(`/posts/${id}`, payload, {
    token,
  });
  return response.data;
}

export async function updatePostPublished(
  id: number,
  published: boolean,
  token: string,
) {
  const action = published ? "publish" : "unpublish";
  const response = await api.patch<PostResponse | null>(
    `/posts/${id}/${action}`,
    undefined,
    { token },
  );
  return response?.data ?? null;
}

export async function deletePost(id: number, token: string) {
  await api.delete<null>(`/posts/${id}`, { token });
}
