import { Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
function App() {
  
  return (
    <>
      <Router>
        <Header />
        <main className='pt-16 pb-16'>
          <Routes>
            <Route index element={<>This is / </>} />
            <Route path='/summary' element={<>This is /summary</>} />
          </Routes>
        </main>
        <Footer />
      </Router>
    </>
  )
}

export default App
