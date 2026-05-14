import { RouterProvider } from 'react-router'
import { router } from './router/index'
import { useTheme } from './hooks/useTheme'

function App() {
  useTheme()

  return <RouterProvider router={router} />
}

export default App