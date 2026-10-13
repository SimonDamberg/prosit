import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import '@fontsource-variable/bitter'
import '@fontsource-variable/grenze-gotisch'
import './index.css'
import ClientApp from './client/ClientApp'
import { TV_LOADING } from './shared/content/ui'
import { LoadingScreen } from './ui'

// The TV app is opened on one screen, so phones should not download it.
// ClientApp stays eager: the phone path is the one that must be fast from a cold QR scan.
const TvApp = lazy(() => import('./tv/TvApp'))
// The styleguide exists in `npm run dev` only: the build drops the route and its chunk.
const Styleguide = import.meta.env.DEV ? lazy(() => import('./styleguide/StyleguideApp')) : null

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ClientApp />} />
        <Route
          path="/tv"
          element={
            <Suspense fallback={<LoadingScreen label={TV_LOADING} />}>
              <TvApp />
            </Suspense>
          }
        />
        {Styleguide && (
          <Route
            path="/styleguide"
            element={
              <Suspense fallback={<LoadingScreen label={TV_LOADING} />}>
                <Styleguide />
              </Suspense>
            }
          />
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
