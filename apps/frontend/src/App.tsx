import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { Layout } from "./components/Layout";
import { HistoryPage } from "./pages/HistoryPage";
import { PRList } from "./pages/PRList";
import { ReviewResult } from "./pages/ReviewResult";
import { SettingsPage } from "./pages/SettingsPage";

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <PRList /> },
      { path: "/review/:owner/:repo/:pullNumber", element: <ReviewResult /> },
      { path: "/history", element: <HistoryPage /> },
      { path: "/settings", element: <SettingsPage /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
