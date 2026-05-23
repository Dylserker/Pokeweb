import { createBrowserRouter } from 'react-router'
import Home from '../pages/Home/Home'
import Trainer from '../pages/Trainer/Trainer'
import Soundtrack from '../pages/Soundtrack/Soundtrack'
import Contact from '../pages/Contact/Contact'
import OneDayOnePokemon from '../pages/OneDayOnePokemon/OneDayOnePokemon'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/trainer',
    element: <Trainer />,
  },
  {
    path: '/soundtrack',
    element: <Soundtrack />,
  },
  {
    path: '/contact',
    element: <Contact />,
  },
  {
    path: '/one-day-one-pokemon',
    element: <OneDayOnePokemon />,
  }
])