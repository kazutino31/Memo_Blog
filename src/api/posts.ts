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

export async function getPosts() {
  const response = await api.get<PostsResponse>("/posts?limit=100");
  return response.data;
}

export async function createPost(payload: CreatePostPayload, token: string) {
  const response = await api.post<PostResponse>("/posts", payload, { token });
  return response.data;
}
