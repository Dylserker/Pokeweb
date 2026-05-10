import { RouterProvider } from 'react-router'
import { router } from './router/index'
import { useTheme } from './hooks/useTheme'

function App() {
  useTheme() // Le hook gère tout

  return <RouterProvider router={router} />
}

export default App