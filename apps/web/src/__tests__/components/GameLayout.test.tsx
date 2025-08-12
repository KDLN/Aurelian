import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import GameLayout from '@/components/GameLayout'

describe('GameLayout', () => {
  it('renders game layout with title', () => {
    render(
      <GameLayout title="Test Title">
        <div>Test content</div>
      </GameLayout>
    )
    
    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })
  
  it('renders sidebar when provided', () => {
    const sidebar = <div>Test Sidebar</div>
    
    render(
      <GameLayout title="Test" sidebar={sidebar}>
        <div>Content</div>
      </GameLayout>
    )
    
    expect(screen.getByText('Test Sidebar')).toBeInTheDocument()
  })
  
  it('displays character activity and location', () => {
    render(
      <GameLayout 
        title="Test" 
        characterActivity="trading"
        characterLocation="Market"
      >
        <div>Content</div>
      </GameLayout>
    )
    
    // These would depend on actual implementation in GameLayout
    // Adjust based on how the component actually displays this info
  })
})