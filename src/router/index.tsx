import { createBrowserRouter } from "react-router-dom";
import BaseLayout from "@/layouts/BaseLayout";
import HomePage from "@/pages/HomePage";
import ArticlePage from "@/pages/ArticlePage";
import CategoryPage from "@/pages/CategoryPage";
import TagPage from "@/pages/TagPage";
import SeriesPage from "@/pages/SeriesPage";
import WarrantsCalculator from "@/pages/WarrantsCalculator";
import TopicMapPage from "@/pages/TopicMapPage";

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
        { path: "/calculator", element: <WarrantsCalculator /> },
        { path: "/topics", element: <TopicMapPage /> },
      ],
    },
  ],
  {
    basename: import.meta.env.BASE_URL,
  },
);
