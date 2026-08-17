import './App.css'
import AIChat from './components/AIChat/AIChat.jsx'
import ProfileSettingsForm from './components/ProfileSettingsForm.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

function App() {
  return (
    <>
      <section id="ai-career-assistant">
        <ErrorBoundary>
          <AIChat />
        </ErrorBoundary>
      </section>

      <section id="profile-settings">
        <ProfileSettingsForm />
      </section>
    </>
  )
}

export default App
