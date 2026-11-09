import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Subject from './pages/Subject'
import Question from './pages/Question'
import About from './pages/About'
import Formulas from './pages/Formulas'
import Picks from './pages/Picks'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="s/:subjectId" element={<Subject />} />
        <Route path="q/:questionId" element={<Question />} />
        <Route path="formulas" element={<Formulas />} />
        <Route path="picks" element={<Picks />} />
        <Route path="about" element={<About />} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  )
}
