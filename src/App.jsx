import './App.css'
import AIChat from './components/AIChat/AIChat.jsx'
import ProfileSettingsForm from './components/ProfileSettingsForm.jsx'

function App() {
  return (
    <>
      <section id="ai-career-assistant">
        <AIChat />
      </section>

      <section id="profile-settings">
        <ProfileSettingsForm />
      </section>
    </>
  )
}

export default App
