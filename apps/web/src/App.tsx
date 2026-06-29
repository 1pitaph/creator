import { createBrowserRouter, RouterProvider } from "react-router";

import { appRoutes } from "./appRoutes";

const appRouter = createBrowserRouter(appRoutes);

export const App = () => <RouterProvider router={appRouter} />;
