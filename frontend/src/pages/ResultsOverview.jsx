import { useNavigate } from 'react-router-dom'
import ResultsPage from '../components/ResultsPage'

export default function ResultsOverview(){
  const navigate = useNavigate()
  function handleNavigate(view){
    if (view === 'global-dashboard') navigate('/results/global')
    else if (view === 'productivity-ratios') navigate('/results/ratios')
    else if (view === 'budget-savings') navigate('/results/economies')
    else if (view === 'position-comparison') navigate('/results/comparatif')
  }
  return (<ResultsPage onBack={() => navigate(-1)} onNavigate={handleNavigate} />)
}
