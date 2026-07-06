import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { StoryPage } from './pages/StoryPage'
import { BiblePage } from './pages/BiblePage'
import { CharactersPage } from './pages/CharactersPage'
import { CharacterDetailPage } from './pages/CharacterDetailPage'
import { WorldPage } from './pages/WorldPage'
import { PlotPage } from './pages/PlotPage'
import { ChaptersPage } from './pages/ChaptersPage'
import { ChapterEditPage } from './pages/ChapterEditPage'
import { WritePage } from './pages/WritePage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/story/:id" element={<StoryPage />} />
            <Route path="/story/:id/bible" element={<BiblePage />} />
            <Route path="/story/:id/characters" element={<CharactersPage />} />
            <Route path="/story/:id/characters/:cid" element={<CharacterDetailPage />} />
            <Route path="/story/:id/world" element={<WorldPage />} />
            <Route path="/story/:id/plot" element={<PlotPage />} />
            <Route path="/story/:id/chapters" element={<ChaptersPage />} />
            <Route path="/story/:id/chapters/:num" element={<ChapterEditPage />} />
            <Route path="/story/:id/write" element={<WritePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
