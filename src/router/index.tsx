import { createBrowserRouter } from "react-router-dom";
import BaseLayout from "@/layouts/BaseLayout";
import HomePage from "@/pages/HomePage";
import ArticlePage from "@/pages/ArticlePage";
import CategoryPage from "@/pages/CategoryPage";
import TagPage from "@/pages/TagPage";
import SeriesPage from "@/pages/SeriesPage";

export const router = createBrowserRouter(
  [
    {
      element: <BaseLayout />,
      children: [
        { path: "/", element: <HomePage /> },
        { path: "/notes/:slug", element: <ArticlePage /> },
        { path: "/category/:category", element: <CategoryPage /> },
        { path: "/tags/:tag", element: <TagPage /> },
        { path: "/series/:series", element: <SeriesPage /> },
      ],
    },
  ],
  {
    basename: import.meta.env.BASE_URL,
  },
);
